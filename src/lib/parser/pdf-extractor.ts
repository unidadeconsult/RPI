import { ParserNotReadyError } from "./not-implemented";

/**
 * Extrator de texto do PDF oficial da RPI (secao 28), usado quando nao
 * ha XML disponivel (prioridade definida na secao 1). Layout visual do
 * PDF ainda nao foi analisado -- sera implementado na Fase 2 apos a
 * analise de um arquivo real (secao 32).
 */
export type ExtractedPdfPage = {
  pageNumber: number;
  text: string;
};

export function extractPdfText(_pdfContent: Buffer): {
  hasSearchableText: boolean;
  pages: ExtractedPdfPage[];
} {
  throw new ParserNotReadyError("extractPdfText");
}
