import { ParserNotReadyError } from "./not-implemented";

/**
 * OCR usado somente quando o PDF nao possui texto pesquisavel (secao 1).
 * Resultado deve ser marcado com nivel de confianca BAIXA (secao 10).
 * Implementacao adiada para a Fase 2.
 */
export function runOcrOnPage(_pageImage: Buffer): { text: string } {
  throw new ParserNotReadyError("runOcrOnPage");
}
