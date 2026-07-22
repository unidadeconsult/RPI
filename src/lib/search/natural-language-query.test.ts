import { describe, expect, it } from "vitest";
import { buildSearchQueryString, parseNaturalLanguageQuery } from "./natural-language-query";

describe("parseNaturalLanguageQuery", () => {
  it("reconhece categoria oposição sem confundir com 'posição'", () => {
    const result = parseNaturalLanguageQuery("processos em oposição");
    expect(result.filters.category).toBe("OPOSICAO");
  });

  it("nao confunde indeferimento com deferimento", () => {
    const result = parseNaturalLanguageQuery("indeferimentos da semana");
    expect(result.filters.category).toBe("INDEFERIMENTO");
  });

  it("reconhece deferimento isoladamente", () => {
    const result = parseNaturalLanguageQuery("deferimentos da semana");
    expect(result.filters.category).toBe("DEFERIMENTO");
  });

  it("extrai marca entre aspas", () => {
    const result = parseNaturalLanguageQuery('marcas semelhantes a "ACME"');
    expect(result.filters.trademark).toBe("ACME");
  });

  it("extrai numero da RPI", () => {
    const result = parseNaturalLanguageQuery("RPI nº 2888 oposição");
    expect(result.filters.rpiNumber).toBe("2888");
    expect(result.filters.category).toBe("OPOSICAO");
  });

  it("extrai numero de processo", () => {
    const result = parseNaturalLanguageQuery("processo 936584432");
    expect(result.filters.processNumber).toBe("936584432");
  });

  it("reconhece nao revisado antes de revisado isolado", () => {
    const result = parseNaturalLanguageQuery("publicações não revisadas");
    expect(result.filters.reviewStatus).toBe("NAO_REVISADO");
  });

  it("reconhece revisado quando nao ha negativa", () => {
    const result = parseNaturalLanguageQuery("processos já revisados");
    expect(result.filters.reviewStatus).toBe("REVISADO");
  });

  it("reconhece confianca alta", () => {
    const result = parseNaturalLanguageQuery("processos com confiança alta");
    expect(result.filters.confidence).toBe("ALTA");
  });

  it("reconhece o filtro /PE (Pernambuco)", () => {
    const result = parseNaturalLanguageQuery("processos em Pernambuco");
    expect(result.filters.peOnly).toBe(true);
  });

  it("reconhece processos fora da carteira", () => {
    const result = parseNaturalLanguageQuery("processos fora da carteira");
    expect(result.filters.semCliente).toBe(true);
  });

  it("extrai UF explicita sem ser engolida pela captura de titular", () => {
    const result = parseNaturalLanguageQuery("titular ACME uf SP");
    expect(result.filters.uf).toBe("SP");
    expect(result.filters.holder).toBe("ACME");
  });

  it("devolve texto nao reconhecido em vez de descartar silenciosamente", () => {
    const result = parseNaturalLanguageQuery("xyzabc123palavradesconhecidasemsentido");
    expect(result.leftoverText.length).toBeGreaterThan(0);
  });

  it("nao deixa texto sobrando quando tudo foi reconhecido", () => {
    const result = parseNaturalLanguageQuery("oposição");
    expect(result.leftoverText).toBe("");
  });
});

describe("buildSearchQueryString", () => {
  it("monta querystring apenas com os filtros presentes", () => {
    const qs = buildSearchQueryString({ category: "OPOSICAO", uf: "SP" });
    const params = new URLSearchParams(qs);
    expect(params.get("category")).toBe("OPOSICAO");
    expect(params.get("uf")).toBe("SP");
    expect(params.has("trademark")).toBe(false);
  });
});
