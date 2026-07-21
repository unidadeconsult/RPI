import { normalizeName } from "./normalize-text";

/**
 * Regra do filtro opcional /PE (secao 4). So deve ser chamada com texto de
 * localizacao que o extrator confirmou pertencer A MESMA publicacao do
 * candidato a procurador -- nunca com texto de outra publicacao ou processo.
 */
export type PeFilterResult =
  | { status: "CONFIRMADO_PE"; sourceExcerpt: string }
  | { status: "CONFIRMADO_OUTRO_ESTADO"; sourceExcerpt: string }
  | { status: "NAO_CONFIRMADO_REVISAR"; sourceExcerpt: null };

const PE_TOKEN = new RegExp("(^|[^A-Z])PE([^A-Z]|$)");

export function evaluatePeFilter(locationTextInSamePublication: string | null | undefined): PeFilterResult {
  if (!locationTextInSamePublication || locationTextInSamePublication.trim() === "") {
    return { status: "NAO_CONFIRMADO_REVISAR", sourceExcerpt: null };
  }

  const normalized = normalizeName(locationTextInSamePublication);
  const matchesPe = PE_TOKEN.test(normalized) || normalized.includes("PERNAMBUCO");

  if (matchesPe) {
    return { status: "CONFIRMADO_PE", sourceExcerpt: locationTextInSamePublication };
  }

  return { status: "CONFIRMADO_OUTRO_ESTADO", sourceExcerpt: locationTextInSamePublication };
}
