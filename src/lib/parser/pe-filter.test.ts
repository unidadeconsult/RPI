import { describe, expect, it } from "vitest";
import { evaluatePeFilter } from "./pe-filter";

describe("evaluatePeFilter", () => {
  it("11. filtro /PE ativo e PE confirmado: incluir", () => {
    const result = evaluatePeFilter("Recife/PE");
    expect(result.status).toBe("CONFIRMADO_PE");
  });

  it("11b. reconhece 'Pernambuco' por extenso", () => {
    const result = evaluatePeFilter("Estado de Pernambuco");
    expect(result.status).toBe("CONFIRMADO_PE");
  });

  it("12. filtro /PE ativo e outro estado: nao incluir como confirmado", () => {
    const result = evaluatePeFilter("Sao Paulo/SP");
    expect(result.status).toBe("CONFIRMADO_OUTRO_ESTADO");
  });

  it("13. filtro /PE ativo e localizacao ausente: revisar", () => {
    const result = evaluatePeFilter(null);
    expect(result.status).toBe("NAO_CONFIRMADO_REVISAR");
  });

  it("13b. string vazia tambem revisa", () => {
    const result = evaluatePeFilter("   ");
    expect(result.status).toBe("NAO_CONFIRMADO_REVISAR");
  });

  it("nao confunde sigla de outro estado que contenha PE como substring (ex: PERNAMBUCO já tratado, mas 'PE' isolado em outro token não)", () => {
    const result = evaluatePeFilter("PERU");
    expect(result.status).toBe("CONFIRMADO_OUTRO_ESTADO");
  });
});
