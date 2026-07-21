import type { DispatchCategory } from "@/generated/prisma/client";

export type DispatchRuleLookup = {
  mainCategory: DispatchCategory;
  subcategory: string | null;
};

export type DispatchClassification = {
  category: DispatchCategory;
  subcategory: string | null;
  isUnknownCode: boolean;
};

/**
 * Classifica um codigo de despacho usando a tabela editavel de regras
 * (dispatch_rules), nunca por palavras soltas (secao 7). Codigos
 * desconhecidos ou ausentes caem em OUTROS_NAO_CLASSIFICADO e sao
 * marcados para revisao -- a publicacao nunca e descartada por isso.
 */
export function classifyDispatchCode(
  code: string | null | undefined,
  rules: ReadonlyMap<string, DispatchRuleLookup>,
): DispatchClassification {
  const trimmedCode = code?.trim();

  if (!trimmedCode) {
    return { category: "OUTROS_NAO_CLASSIFICADO", subcategory: null, isUnknownCode: true };
  }

  const rule = rules.get(trimmedCode);
  if (!rule) {
    return { category: "OUTROS_NAO_CLASSIFICADO", subcategory: null, isUnknownCode: true };
  }

  return {
    category: rule.mainCategory,
    subcategory: rule.subcategory,
    isUnknownCode: false,
  };
}
