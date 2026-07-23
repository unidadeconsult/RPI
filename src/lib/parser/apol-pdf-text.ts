// Precisa ser o primeiro import -- ver o comentario dentro do arquivo.
// Modulos ES avaliam imports na ordem em que aparecem, entao isso garante
// que DOMMatrix/Path2D existam em globalThis antes do pdfjs-dist carregar.
import "./pdfjs-node-polyfills";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { WorkerMessageHandler } from "pdfjs-dist/legacy/build/pdf.worker.mjs";

// Em Node.js o pdfjs-dist roda o parsing na mesma thread ("fake worker"),
// mas por padrao ele tenta localizar o arquivo pdf.worker.mjs via um
// import() dinamico relativo ao caminho do modulo em tempo de execucao --
// isso quebra quando o Next.js empacota o codigo em chunks (o arquivo
// fisico do worker nao fica mais no caminho esperado). Registrando o
// handler aqui via import estatico (que o bundler resolve normalmente),
// o pdfjs-dist usa esse handler direto e nunca tenta o import() dinamico.
(globalThis as unknown as { pdfjsWorker?: { WorkerMessageHandler: typeof WorkerMessageHandler } }).pdfjsWorker = {
  WorkerMessageHandler,
};

/**
 * Item de texto posicionado extraido de uma pagina do PDF, com a fonte
 * resolvida (para permitir detectar negrito == nome de marca no layout
 * APOL -- ver apol-pdf-parser.ts).
 */
export type PositionedTextItem = {
  page: number;
  x: number;
  y: number;
  text: string;
  bold: boolean;
};

/**
 * Extrai o texto posicionado (com negrito resolvido pela fonte real do
 * PDF, ex.: "Verdana-Bold") de todas as paginas de um PDF pesquisavel.
 * Nao faz OCR -- para PDFs sem texto (escaneados), o chamador deve usar
 * o modulo de OCR (secao 1: OCR somente quando o PDF nao tiver texto
 * pesquisavel).
 */
export async function extractPositionedTextFromPdf(
  buffer: Buffer,
): Promise<PositionedTextItem[]> {
  const data = new Uint8Array(buffer);
  const doc = await getDocument({ data }).promise;

  const items: PositionedTextItem[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    // Forca o registro dos objetos de fonte antes de ler o texto, para
    // que o nome real da fonte (ex.: "Verdana-Bold") fique disponivel.
    await page.getOperatorList();
    const textContent = await page.getTextContent();

    for (const item of textContent.items) {
      if (!("str" in item) || item.str.trim() === "") continue;

      let fontName = item.fontName;
      if (page.commonObjs.has(fontName)) {
        const fontObj = page.commonObjs.get(fontName) as { name?: string } | undefined;
        fontName = fontObj?.name ?? fontName;
      }

      items.push({
        page: pageNumber,
        x: Math.round(item.transform[4] * 100) / 100,
        y: Math.round(item.transform[5] * 100) / 100,
        text: item.str,
        bold: fontName.toLowerCase().includes("bold"),
      });
    }
  }

  return items;
}

export async function countPdfPages(buffer: Buffer): Promise<number> {
  const data = new Uint8Array(buffer);
  const doc = await getDocument({ data }).promise;
  return doc.numPages;
}
