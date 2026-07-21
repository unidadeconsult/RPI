import type { PositionedTextItem } from "./apol-pdf-text";

/**
 * Parser do relatorio "Consulta Livre na RPI" exportado pelo sistema APOL
 * (LDSoft) -- confirmado como o formato real de entrada semanal (analise
 * da RPI 2888, seção 32). NAO é o XML nem o PDF oficial do INPI: é um
 * relatorio de terceiros com layout tabular por posicao (colunas fixas),
 * sem tags. A estrutura foi validada linha a linha contra o arquivo real:
 *
 *  - Coluna ~x<60: letra de apresentacao da marca (F/M/N), em negrito,
 *    opcional.
 *  - Coluna ~60-120: numero do processo (9 digitos) -- ancora de cada
 *    registro.
 *  - Coluna ~120-440: nome da marca (negrito, 0+ linhas, aparecem ANTES
 *    da linha-ancora), titular(es) (linha inline na ancora e/ou linhas
 *    seguintes terminadas em "(BR/UF)") e procurador (linha(s) seguintes
 *    sem o sufixo "(BR/UF)").
 *  - Coluna ~440+: classes NCL (ou "/" quando nao ha classe) seguidas do
 *    codigo do despacho, na mesma linha. O despacho e alinhado a direita,
 *    entao sua posicao X inicial varia com o tamanho do codigo (ex.:
 *    "I029" comeca mais a direita que "I270-3745") -- por isso as duas
 *    colunas sao tratadas como uma so e depois separadas por regex, em
 *    vez de um segundo corte fixo de X que se mostrou fragil no arquivo
 *    real.
 *
 * O papel de cada linha da coluna central é inferido pela negrito (marca)
 * e pela presenca do sufixo "(BR/UF)" (titular) -- nunca por um rotulo
 * explicito, pois o arquivo nao tem nenhum.
 */

const COLUMN_BOUNDARIES = {
  flagMax: 60,
  procMax: 120,
  bodyMax: 440,
};

const PROCESS_NUMBER_PATTERN = /^\d{8,9}$/;
const UF_SUFFIX_PATTERN = /\(BR\/[A-Z]{2}\)\s*,?\s*$/;
const UF_CAPTURE_PATTERN = /\(BR\/([A-Z]{2})\)/g;
const DISPATCH_CODE_PATTERN = /(I\d+(?:-\d+)?)\s*$/;

type Column = "FLAG" | "PROC" | "BODY" | "RIGHT";

function columnFor(x: number): Column {
  if (x < COLUMN_BOUNDARIES.flagMax) return "FLAG";
  if (x < COLUMN_BOUNDARIES.procMax) return "PROC";
  if (x < COLUMN_BOUNDARIES.bodyMax) return "BODY";
  return "RIGHT";
}

/** Separa "NCL(12) 25 I270-3881" (ou "/ I395") em classes + despacho. */
function splitClassesAndDispatch(rightText: string | null): {
  classesRaw: string | null;
  dispatchCode: string | null;
} {
  if (!rightText) return { classesRaw: null, dispatchCode: null };

  const dispatchMatch = rightText.match(DISPATCH_CODE_PATTERN);
  if (!dispatchMatch) {
    return { classesRaw: rightText.trim() || null, dispatchCode: null };
  }

  const dispatchCode = dispatchMatch[1];
  const classesRaw = rightText.slice(0, dispatchMatch.index).trim();
  return {
    classesRaw: classesRaw === "" ? null : classesRaw,
    dispatchCode,
  };
}

type Line = {
  page: number;
  y: number;
  column: Column;
  text: string;
  bold: boolean;
};

function buildLines(items: PositionedTextItem[]): Line[] {
  const sorted = [...items].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    if (a.y !== b.y) return b.y - a.y;
    return a.x - b.x;
  });

  const groups = new Map<string, PositionedTextItem[]>();
  for (const item of sorted) {
    const column = columnFor(item.x);
    const key = `${item.page}|${item.y}|${column}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  const lines: Line[] = [];
  for (const [key, groupItems] of groups) {
    const [pageStr, yStr, column] = key.split("|");
    const text = groupItems
      .map((i) => i.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text === "") continue;
    lines.push({
      page: Number(pageStr),
      y: Number(yStr),
      column: column as Column,
      text,
      bold: groupItems.some((i) => i.bold),
    });
  }

  return lines.sort((a, b) => (a.page !== b.page ? a.page - b.page : b.y - a.y));
}

export type ApolPdfRecord = {
  page: number;
  processNumber: string;
  presentationFlag: string | null;
  trademarkName: string | null;
  holderLines: string[];
  attorneyLines: string[];
  classesRaw: string | null;
  dispatchCode: string | null;
};

/**
 * Agrupa os itens de texto posicionados (ja extraidos do PDF) nos
 * registros do relatorio APOL. Funcao pura -- nao le arquivo, so recebe
 * os itens ja extraidos (ver apol-pdf-text.ts), o que a torna totalmente
 * testavel sem precisar de um PDF real.
 */
export function groupApolPdfRecords(items: PositionedTextItem[]): ApolPdfRecord[] {
  const lines = buildLines(items);

  type AnchorInfo = {
    page: number;
    y: number;
    processNumber: string;
    presentationFlag: string | null;
    classesRaw: string | null;
    dispatchCode: string | null;
    inlineHolder: string | null;
  };

  // Linhas de anchor sao identificadas pela coluna PROC contendo um
  // numero de processo. As demais colunas na mesma (pagina,y) pertencem
  // ao mesmo registro.
  const byPageY = new Map<string, Line[]>();
  for (const line of lines) {
    const key = `${line.page}|${line.y}`;
    if (!byPageY.has(key)) byPageY.set(key, []);
    byPageY.get(key)!.push(line);
  }

  const anchors: AnchorInfo[] = [];
  for (const [, rowLines] of byPageY) {
    const procLine = rowLines.find((l) => l.column === "PROC");
    if (!procLine || !PROCESS_NUMBER_PATTERN.test(procLine.text)) continue;

    const flagLine = rowLines.find((l) => l.column === "FLAG");
    const bodyLine = rowLines.find((l) => l.column === "BODY");
    const rightLine = rowLines.find((l) => l.column === "RIGHT");
    const { classesRaw, dispatchCode } = splitClassesAndDispatch(rightLine?.text ?? null);

    anchors.push({
      page: procLine.page,
      y: procLine.y,
      processNumber: procLine.text,
      presentationFlag: flagLine?.text ?? null,
      classesRaw,
      dispatchCode,
      inlineHolder: bodyLine?.text ?? null,
    });
  }

  anchors.sort((a, b) => (a.page !== b.page ? a.page - b.page : b.y - a.y));

  const bodyOnlyLines = lines
    .filter((l) => l.column === "BODY")
    .filter((l) => {
      // remove a linha inline da propria ancora (ja capturada acima)
      return !anchors.some((a) => a.page === l.page && a.y === l.y);
    });

  const sequence: Array<
    | { kind: "ANCHOR"; anchor: AnchorInfo }
    | { kind: "BODY"; line: Line }
  > = [
    ...anchors.map((anchor) => ({ kind: "ANCHOR" as const, anchor })),
    ...bodyOnlyLines.map((line) => ({ kind: "BODY" as const, line })),
  ].sort((a, b) => {
    const pa = a.kind === "ANCHOR" ? a.anchor.page : a.line.page;
    const pb = b.kind === "ANCHOR" ? b.anchor.page : b.line.page;
    if (pa !== pb) return pa - pb;
    const ya = a.kind === "ANCHOR" ? a.anchor.y : a.line.y;
    const yb = b.kind === "ANCHOR" ? b.anchor.y : b.line.y;
    return yb - ya;
  });

  const records: ApolPdfRecord[] = [];
  let current: ApolPdfRecord | null = null;
  let pendingMarcaLines: string[] = [];
  let pendingHolderPrefixLines: string[] = [];

  for (const entry of sequence) {
    if (entry.kind === "ANCHOR") {
      const { anchor } = entry;
      const holderLines: string[] = [...pendingHolderPrefixLines];
      if (anchor.inlineHolder) holderLines.push(anchor.inlineHolder);

      current = {
        page: anchor.page,
        processNumber: anchor.processNumber,
        presentationFlag: anchor.presentationFlag,
        trademarkName: pendingMarcaLines.length > 0 ? pendingMarcaLines.join(" ") : null,
        holderLines,
        attorneyLines: [],
        classesRaw: anchor.classesRaw,
        dispatchCode: anchor.dispatchCode,
      };
      records.push(current);
      pendingMarcaLines = [];
      pendingHolderPrefixLines = [];
      continue;
    }

    const { line } = entry;
    if (line.bold) {
      // Negrito depois do ultimo registro fechado pertence ao nome da
      // marca do PROXIMO registro (a marca sempre aparece antes da
      // linha-ancora do processo a que se refere).
      pendingMarcaLines.push(line.text);
      continue;
    }

    if (pendingMarcaLines.length > 0) {
      // Ja vimos o nome da marca do proximo registro: esta linha (sem
      // negrito) e o inicio do(s) titular(es) desse proximo registro.
      pendingHolderPrefixLines.push(line.text);
      continue;
    }

    if (!current) continue; // texto de cabecalho antes do primeiro registro

    if (current.attorneyLines.length === 0 && UF_SUFFIX_PATTERN.test(line.text)) {
      current.holderLines.push(line.text);
    } else {
      current.attorneyLines.push(line.text);
    }
  }

  return records;
}

export function extractHolderUfs(record: ApolPdfRecord): string[] {
  const ufs = new Set<string>();
  for (const line of record.holderLines) {
    for (const match of line.matchAll(UF_CAPTURE_PATTERN)) {
      ufs.add(match[1]);
    }
  }
  return [...ufs];
}

export function parseNiceClasses(classesRaw: string | null): string[] {
  if (!classesRaw) return [];
  const trimmed = classesRaw.trim();
  if (trimmed === "" || trimmed === "/") return [];
  // formato observado: "NCL(12) 36" (edicao 12, classe 36) ou variações
  // como "32/10". Preserva o texto original em outro lugar para auditoria;
  // aqui so extrai o(s) numero(s) de classe quando reconhecivel.
  const match = trimmed.match(/NCL\(\d+\)\s*(\d+)/);
  if (match) return [match[1]];
  return [trimmed];
}
