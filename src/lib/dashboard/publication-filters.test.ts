import { describe, expect, it } from "vitest";
import { buildPublicationWhere, parsePublicationFilters } from "./publication-filters";

describe("parsePublicationFilters", () => {
  it("usa valores padrao quando nada e informado", () => {
    const filters = parsePublicationFilters({});
    expect(filters.category).toBe("");
    expect(filters.peOnly).toBe(false);
    expect(filters.page).toBe(1);
  });

  it("ignora categoria invalida", () => {
    const filters = parsePublicationFilters({ category: "NAO_EXISTE" });
    expect(filters.category).toBe("");
  });

  it("aceita categoria valida", () => {
    const filters = parsePublicationFilters({ category: "OPOSICAO" });
    expect(filters.category).toBe("OPOSICAO");
  });

  it("normaliza UF para maiusculas", () => {
    const filters = parsePublicationFilters({ uf: "pe" });
    expect(filters.uf).toBe("PE");
  });

  it("le peOnly a partir do checkbox 'on'", () => {
    expect(parsePublicationFilters({ peOnly: "on" }).peOnly).toBe(true);
    expect(parsePublicationFilters({}).peOnly).toBe(false);
  });

  it("garante pagina minima 1", () => {
    expect(parsePublicationFilters({ page: "0" }).page).toBe(1);
    expect(parsePublicationFilters({ page: "abc" }).page).toBe(1);
    expect(parsePublicationFilters({ page: "3" }).page).toBe(3);
  });
});

describe("buildPublicationWhere", () => {
  const base = parsePublicationFilters({});

  it("10. busca padrao sem /PE: incluir todos os estados (where vazio, sem restricao de peStatus)", () => {
    expect(buildPublicationWhere(base)).toEqual({});
  });

  it("filtra por categoria", () => {
    const where = buildPublicationWhere({ ...base, category: "DEFERIMENTO" });
    expect(where.category).toBe("DEFERIMENTO");
  });

  it("filtra por /PE apenas quando peOnly", () => {
    const where = buildPublicationWhere({ ...base, peOnly: true });
    expect(where.peStatus).toBe("CONFIRMADO_PE");
  });

  it("filtra por titular via marca do processo", () => {
    const where = buildPublicationWhere({ ...base, trademark: "ACME" });
    expect(where.proceeding).toEqual({
      trademarks: { some: { name: { contains: "ACME", mode: "insensitive" } } },
    });
  });

  it("combina multiplos filtros", () => {
    const where = buildPublicationWhere({
      ...base,
      category: "OPOSICAO",
      uf: "PE",
      reviewStatus: "NAO_REVISADO",
    });
    expect(where).toEqual({
      category: "OPOSICAO",
      locationUf: "PE",
      reviewStatus: "NAO_REVISADO",
    });
  });
});
