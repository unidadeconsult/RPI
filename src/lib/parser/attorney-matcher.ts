import { normalizeName } from "./normalize-text";

/**
 * Papel do campo em que o nome candidato foi encontrado, ja classificado
 * pelo extrator (XML/PDF) da Fase 2. Esta funcao nao decide QUAL campo é o
 * de procurador -- isso depende da estrutura real da RPI, ainda nao
 * analisada. Ela apenas aplica a regra de negocio da secao 2 a partir de
 * uma classificacao de campo ja feita.
 */
export type CandidateFieldRole =
  | "PROCURADOR"
  | "OUTRO_PAPEL"
  | "TEXTO_LIVRE"
  | "VINCULO_INCERTO";

export type AttorneyMatchDecision =
  | { status: "EXCLUIDO"; reason: string }
  | { status: "CONFIRMADO"; matchedName: string }
  | { status: "DUVIDOSO_REVISAR"; reason: string };

export const JANE_GLAUCIA_VIEIRA_NORMALIZED = normalizeName("JANE GLAUCIA VIEIRA");

export type EvaluateAttorneyCandidateParams = {
  nameRaw: string;
  fieldRole: CandidateFieldRole;
  /** Variacoes cadastradas manualmente pelo administrador (ja normalizadas). */
  registeredAliasesNormalized?: string[];
};

export function evaluateAttorneyCandidate({
  nameRaw,
  fieldRole,
  registeredAliasesNormalized = [],
}: EvaluateAttorneyCandidateParams): AttorneyMatchDecision {
  const normalized = normalizeName(nameRaw);

  const isExactTarget = normalized === JANE_GLAUCIA_VIEIRA_NORMALIZED;
  const isRegisteredAlias = registeredAliasesNormalized.includes(normalized);

  if (!isExactTarget && !isRegisteredAlias) {
    return {
      status: "EXCLUIDO",
      reason:
        "Nome nao corresponde a JANE GLAUCIA VIEIRA nem a variacao cadastrada pelo administrador.",
    };
  }

  if (fieldRole === "OUTRO_PAPEL") {
    return {
      status: "EXCLUIDO",
      reason: "Nome encontrado em campo diferente de procurador/procuradora.",
    };
  }

  if (fieldRole === "TEXTO_LIVRE") {
    return {
      status: "EXCLUIDO",
      reason:
        "Nome encontrado apenas no texto corrido, sem vinculo confirmado com o campo de procurador.",
    };
  }

  if (fieldRole === "VINCULO_INCERTO") {
    return {
      status: "DUVIDOSO_REVISAR",
      reason:
        "VINCULO COM PROCURADOR NAO CONFIRMADO -- REVISAR: nao foi possivel confirmar com seguranca que o nome pertence ao campo de procurador desta publicacao.",
    };
  }

  return { status: "CONFIRMADO", matchedName: normalized };
}
