import { ParserNotReadyError } from "./not-implemented";

/**
 * Parser do XML oficial da RPI (secao 28). Estrutura ainda desconhecida --
 * sera implementada na Fase 2 apos a analise de um arquivo real fornecido
 * pelo usuario (secao 32). Nao inventar tags, campos ou hierarquia aqui.
 */
export type ParsedXmlPublication = {
  processNumberRaw: string | null;
  dispatchCodeRaw: string | null;
  dispatchDescriptionRaw: string | null;
  sourceStructureRaw: string;
};

export function parseRpiXml(_xmlContent: Buffer): ParsedXmlPublication[] {
  throw new ParserNotReadyError("parseRpiXml");
}
