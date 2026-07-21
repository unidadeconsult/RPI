import { ParserNotReadyError } from "./not-implemented";

/**
 * Extratores de campo (processo, marca, titular, classe, localizacao) --
 * secao 28. Dependem diretamente da estrutura real do XML/PDF da RPI, que
 * ainda nao foi analisada. Implementar somente apos a Fase 2 confirmar os
 * campos e tags reais (secao 32).
 */
export function extractProcessNumber(_sourceStructureRaw: string): string | null {
  throw new ParserNotReadyError("extractProcessNumber");
}

export function extractTrademark(_sourceStructureRaw: string): {
  name: string;
  presentationType: string | null;
  nature: string | null;
} | null {
  throw new ParserNotReadyError("extractTrademark");
}

export function extractHolder(_sourceStructureRaw: string): { name: string; cpfCnpj: string | null } | null {
  throw new ParserNotReadyError("extractHolder");
}

export function extractNiceClasses(_sourceStructureRaw: string): string[] {
  throw new ParserNotReadyError("extractNiceClasses");
}

export function extractLocation(_sourceStructureRaw: string): { raw: string; uf: string | null } | null {
  throw new ParserNotReadyError("extractLocation");
}
