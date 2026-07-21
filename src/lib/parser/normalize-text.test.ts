import { describe, expect, it } from "vitest";
import { normalizeName } from "./normalize-text";

describe("normalizeName", () => {
  it("converte para maiusculas", () => {
    expect(normalizeName("Jane Glaucia Vieira")).toBe("JANE GLAUCIA VIEIRA");
  });

  it("remove acentos", () => {
    expect(normalizeName("JANE GLÁUCIA VIEIRA")).toBe("JANE GLAUCIA VIEIRA");
  });

  it("colapsa espacos duplicados", () => {
    expect(normalizeName("JANE  GLAUCIA   VIEIRA")).toBe("JANE GLAUCIA VIEIRA");
  });

  it("trata quebras de linha como espaco", () => {
    expect(normalizeName("JANE GLAUCIA\nVIEIRA")).toBe("JANE GLAUCIA VIEIRA");
  });

  it("remove pontuacao sem relevancia", () => {
    expect(normalizeName("JANE, GLAUCIA. VIEIRA;")).toBe("JANE GLAUCIA VIEIRA");
  });

  it("todas as variacoes convergem para o mesmo valor normalizado", () => {
    const variants = [
      "JANE GLAUCIA VIEIRA",
      "Jane Glaucia Vieira",
      "JANE GLÁUCIA VIEIRA",
      "JANE  GLAUCIA  VIEIRA",
    ];
    const normalized = variants.map(normalizeName);
    expect(new Set(normalized).size).toBe(1);
  });

  it("nao aceita abreviacao nao cadastrada como igual ao nome completo", () => {
    expect(normalizeName("JANE G. VIEIRA")).not.toBe(normalizeName("JANE GLAUCIA VIEIRA"));
  });
});
