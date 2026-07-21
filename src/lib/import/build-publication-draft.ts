import type { ApolPdfRecord } from "@/lib/parser/apol-pdf-parser";
import { parseNiceClasses } from "@/lib/parser/apol-pdf-parser";
import { evaluateAttorneyCandidate } from "@/lib/parser/attorney-matcher";
import { evaluatePeFilter } from "@/lib/parser/pe-filter";
import { buildPublicationHash } from "@/lib/parser/publication-hash";
import { normalizeName } from "@/lib/parser/normalize-text";
import { splitHolders, type SplitHolder } from "./holder-splitter";

export type AttorneyDraft = {
  nameRaw: string;
  normalizedName: string;
  matchStatus: "CONFIRMADO" | "DUVIDOSO_REVISAR";
};

export type PublicationDraft = {
  processNumber: string;
  presentationFlag: string | null;
  trademarkName: string | null;
  holders: SplitHolder[];
  attorneys: AttorneyDraft[];
  niceClasses: string[];
  dispatchCodeRaw: string | null;
  peStatus: "CONFIRMADO_PE" | "CONFIRMADO_OUTRO_ESTADO" | "NAO_CONFIRMADO_REVISAR";
  peSourceExcerpt: string | null;
  pdfPage: number;
  publicationHash: string;
};

export type BuildDraftContext = {
  rpiNumber: string;
  rpiDate: string;
  /** Variacoes de nome cadastradas manualmente pelo administrador (seção 3). */
  registeredAliasesNormalized?: string[];
};

function renderSourceExcerpt(record: ApolPdfRecord): string {
  const parts = [
    record.trademarkName,
    `${record.processNumber} ${record.holderLines.join(" / ")}`.trim(),
    ...record.attorneyLines,
  ].filter((part): part is string => Boolean(part && part.trim() !== ""));
  return parts.join("\n");
}

/**
 * Constroi o rascunho de publicacao a partir de um registro extraido do
 * relatorio APOL, aplicando a regra de busca de JANE GLAUCIA VIEIRA como
 * procuradora (secao 2) e o filtro /PE (secao 4). Retorna null quando
 * nenhuma linha de procurador do registro corresponde ao nome-alvo (nem
 * confirmado, nem duvidoso) -- esses registros nao sao publicacoes de
 * interesse do sistema e nao devem ser persistidos (o escopo do app e
 * localizar os processos de JANE GLAUCIA VIEIRA como procuradora, nao
 * armazenar toda a RPI).
 */
export function buildPublicationDraft(
  record: ApolPdfRecord,
  context: BuildDraftContext,
): PublicationDraft | null {
  const attorneys: AttorneyDraft[] = [];

  for (const attorneyLine of record.attorneyLines) {
    const decision = evaluateAttorneyCandidate({
      nameRaw: attorneyLine,
      fieldRole: "PROCURADOR",
      registeredAliasesNormalized: context.registeredAliasesNormalized,
    });

    if (decision.status === "EXCLUIDO") continue;

    attorneys.push({
      nameRaw: attorneyLine,
      normalizedName: normalizeName(attorneyLine),
      matchStatus: decision.status,
    });
  }

  if (attorneys.length === 0) return null;

  const holders = splitHolders(record.holderLines);
  const peResult = evaluatePeFilter(record.holderLines.join("; ") || null);

  const publicationHash = buildPublicationHash({
    rpiNumber: context.rpiNumber,
    rpiDate: context.rpiDate,
    processNumber: record.processNumber,
    dispatchCode: record.dispatchCode,
    description: null,
    trademarkName: record.trademarkName,
    holderName: holders.map((h) => h.nameRaw).join("; "),
    attorneyName: record.attorneyLines.join("; "),
  });

  return {
    processNumber: record.processNumber,
    presentationFlag: record.presentationFlag,
    trademarkName: record.trademarkName,
    holders,
    attorneys,
    niceClasses: parseNiceClasses(record.classesRaw),
    dispatchCodeRaw: record.dispatchCode,
    peStatus: peResult.status,
    peSourceExcerpt: peResult.sourceExcerpt,
    pdfPage: record.page,
    publicationHash,
  };
}

export { renderSourceExcerpt };
