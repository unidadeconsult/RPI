import { describe, expect, it } from "vitest";
import {
  classifyMatchType,
  computeNameScore,
  diceCoefficient,
  evaluateMonitoredMatch,
  niceClassesOverlap,
} from "./trademark-similarity";

describe("diceCoefficient", () => {
  it("retorna 1 para strings identicas", () => {
    expect(diceCoefficient("NIKE", "NIKE")).toBe(1);
  });

  it("retorna 0 para strings completamente diferentes", () => {
    expect(diceCoefficient("ABC", "XYZ")).toBe(0);
  });

  it("retorna score alto para nomes quase identicos", () => {
    expect(diceCoefficient("NIKE", "NIKEE")).toBeGreaterThan(0.7);
  });
});

describe("classifyMatchType", () => {
  it("classifica faixas conforme a secao 20", () => {
    expect(classifyMatchType(0.99)).toBe("IDENTICA");
    expect(classifyMatchType(0.9)).toBe("ALTA");
    expect(classifyMatchType(0.75)).toBe("MEDIA");
    expect(classifyMatchType(0.55)).toBe("BAIXA");
    expect(classifyMatchType(0.2)).toBeNull();
  });
});

describe("niceClassesOverlap", () => {
  it("detecta sobreposicao de classes NCL", () => {
    expect(niceClassesOverlap(["25", "35"], ["35"])).toBe(true);
    expect(niceClassesOverlap(["25"], ["09"])).toBe(false);
  });

  it("retorna false quando alguma lista esta vazia (nao inventa sobreposicao)", () => {
    expect(niceClassesOverlap([], ["25"])).toBe(false);
    expect(niceClassesOverlap(["25"], [])).toBe(false);
  });
});

describe("computeNameScore", () => {
  it("ignora termos genericos cadastrados pelo administrador", () => {
    const result = computeNameScore("SUPER MARCA COMERCIO LTDA", {
      mainExpression: "SUPER MARCA",
      variations: [],
      ignoredTerms: ["COMERCIO", "LTDA"],
    });
    expect(result.score).toBeGreaterThan(0.9);
  });

  it("considera a melhor variacao cadastrada", () => {
    const result = computeNameScore("MARCA XPTO", {
      mainExpression: "OUTRA COISA",
      variations: ["MARCA XPTO"],
      ignoredTerms: [],
    });
    expect(result.score).toBe(1);
    expect(result.matchedTerm).toBe("MARCA XPTO");
  });
});

describe("evaluateMonitoredMatch", () => {
  const baseMonitored = {
    mainExpression: "ACME",
    variations: [],
    ignoredTerms: [],
    niceClasses: ["25"],
    titular: "TITULAR ORIGINAL LTDA",
    minSimilarity: 0.7,
  };

  it("retorna null quando o score fica abaixo do minimo configurado", () => {
    const result = evaluateMonitoredMatch({
      monitored: baseMonitored,
      candidate: { trademarkName: "COMPLETAMENTE DIFERENTE", niceClasses: ["25"], titularNames: ["OUTRO"] },
    });
    expect(result).toBeNull();
  });

  it("gera avaliacao com titularDiffers=false quando o titular bate", () => {
    const result = evaluateMonitoredMatch({
      monitored: baseMonitored,
      candidate: {
        trademarkName: "ACME",
        niceClasses: ["25"],
        titularNames: ["Titular Original LTDA"],
      },
    });
    expect(result).not.toBeNull();
    expect(result!.matchType).toBe("IDENTICA");
    expect(result!.niceClassMatch).toBe(true);
    expect(result!.titularDiffers).toBe(false);
  });

  it("marca titularDiffers=true quando a marca monitorada nao tem titular cadastrado", () => {
    const result = evaluateMonitoredMatch({
      monitored: { ...baseMonitored, titular: null },
      candidate: { trademarkName: "ACME", niceClasses: ["25"], titularNames: ["QUALQUER UM"] },
    });
    expect(result!.titularDiffers).toBe(true);
  });
});
