import { describe, expect, it } from "vitest";
import { evaluateAttorneyCandidate } from "./attorney-matcher";

describe("evaluateAttorneyCandidate", () => {
  it("1. Jane como procuradora: incluir (CONFIRMADO)", () => {
    const result = evaluateAttorneyCandidate({
      nameRaw: "JANE GLAUCIA VIEIRA",
      fieldRole: "PROCURADOR",
    });
    expect(result.status).toBe("CONFIRMADO");
  });

  it("2. Jane como titular: excluir", () => {
    const result = evaluateAttorneyCandidate({
      nameRaw: "JANE GLAUCIA VIEIRA",
      fieldRole: "OUTRO_PAPEL",
    });
    expect(result.status).toBe("EXCLUIDO");
  });

  it("3. Jane como requerente: excluir", () => {
    const result = evaluateAttorneyCandidate({
      nameRaw: "JANE GLAUCIA VIEIRA",
      fieldRole: "OUTRO_PAPEL",
    });
    expect(result.status).toBe("EXCLUIDO");
  });

  it("4. Jane mencionada apenas no texto: excluir", () => {
    const result = evaluateAttorneyCandidate({
      nameRaw: "JANE GLAUCIA VIEIRA",
      fieldRole: "TEXTO_LIVRE",
    });
    expect(result.status).toBe("EXCLUIDO");
  });

  it("5. outro procurador: excluir", () => {
    const result = evaluateAttorneyCandidate({
      nameRaw: "MARIA DA SILVA SANTOS",
      fieldRole: "PROCURADOR",
    });
    expect(result.status).toBe("EXCLUIDO");
  });

  it("6. nome com acento: reconhecer", () => {
    const result = evaluateAttorneyCandidate({
      nameRaw: "JANE GLÁUCIA VIEIRA",
      fieldRole: "PROCURADOR",
    });
    expect(result.status).toBe("CONFIRMADO");
  });

  it("7. nome com espacos duplicados: reconhecer", () => {
    const result = evaluateAttorneyCandidate({
      nameRaw: "JANE  GLAUCIA  VIEIRA",
      fieldRole: "PROCURADOR",
    });
    expect(result.status).toBe("CONFIRMADO");
  });

  it("8. abreviacao nao cadastrada: nao confirmar", () => {
    const result = evaluateAttorneyCandidate({
      nameRaw: "JANE G. VIEIRA",
      fieldRole: "PROCURADOR",
    });
    expect(result.status).toBe("EXCLUIDO");
  });

  it("8b. abreviacao cadastrada pelo administrador: confirmar", () => {
    const result = evaluateAttorneyCandidate({
      nameRaw: "JANE G. VIEIRA",
      fieldRole: "PROCURADOR",
      registeredAliasesNormalized: ["JANE G VIEIRA"],
    });
    expect(result.status).toBe("CONFIRMADO");
  });

  it("9. vinculo duvidoso: enviar para revisao", () => {
    const result = evaluateAttorneyCandidate({
      nameRaw: "JANE GLAUCIA VIEIRA",
      fieldRole: "VINCULO_INCERTO",
    });
    expect(result.status).toBe("DUVIDOSO_REVISAR");
  });
});
