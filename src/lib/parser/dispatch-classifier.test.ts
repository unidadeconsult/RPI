import { describe, expect, it } from "vitest";
import { classifyDispatchCode, type DispatchRuleLookup } from "./dispatch-classifier";

describe("classifyDispatchCode", () => {
  const rules = new Map<string, DispatchRuleLookup>([
    ["IPAS021", { mainCategory: "DEFERIMENTO", subcategory: "Deferimento de pedido" }],
  ]);

  it("29. codigo conhecido: usa a regra cadastrada", () => {
    const result = classifyDispatchCode("IPAS021", rules);
    expect(result).toEqual({
      category: "DEFERIMENTO",
      subcategory: "Deferimento de pedido",
      isUnknownCode: false,
    });
  });

  it("30. codigo desconhecido: OUTROS_NAO_CLASSIFICADO, mas nao descarta", () => {
    const result = classifyDispatchCode("CODIGO-INEXISTENTE", rules);
    expect(result.category).toBe("OUTROS_NAO_CLASSIFICADO");
    expect(result.isUnknownCode).toBe(true);
  });

  it("codigo ausente: OUTROS_NAO_CLASSIFICADO", () => {
    const result = classifyDispatchCode(null, rules);
    expect(result.category).toBe("OUTROS_NAO_CLASSIFICADO");
    expect(result.isUnknownCode).toBe(true);
  });
});
