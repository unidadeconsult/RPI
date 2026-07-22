import { describe, expect, it } from "vitest";
import { buildEmailText, buildWhatsAppSummary, type WeeklyReportData } from "./weekly-report";

const baseReport: WeeklyReportData = {
  rpiEditionId: "edition-1",
  rpiNumber: "2888",
  rpiDate: new Date("2026-07-21T00:00:00Z"),
  totalOcorrencias: 37,
  totalConfirmadas: 33,
  totalDuvidosas: 4,
  categoryCounts: [
    { category: "OPOSICAO", count: 4 },
    { category: "DEFERIMENTO", count: 10 },
  ],
  processosNovos: 12,
  mudancasDeSituacao: 3,
  prazosUrgentes: 4,
  tarefasCriadas: 5,
  pendentesRevisao: 7,
  codigosDesconhecidos: 2,
  processosForaDaCarteira: 3,
  marcasSemelhantesEncontradas: 0,
  documentosPendentes: 6,
};

describe("buildWhatsAppSummary", () => {
  it("segue o exemplo do escopo (secao 22)", () => {
    const text = buildWhatsAppSummary(baseReport);
    expect(text).toContain("RPI nº 2888");
    expect(text).toContain("37");
    expect(text).toContain("Jane Glaucia Vieira");
    expect(text).toContain("procuradora");
  });

  it("inclui prazos urgentes e pendentes de revisao", () => {
    const text = buildWhatsAppSummary(baseReport);
    expect(text).toContain("Prazos urgentes (7 dias): 4");
    expect(text).toContain("Pendentes de revisão: 7");
  });
});

describe("buildEmailText", () => {
  it("inclui o aviso de que nao substitui analise juridica", () => {
    const text = buildEmailText(baseReport);
    expect(text).toContain("não substitui a análise jurídica profissional");
  });

  it("lista as categorias com contagem", () => {
    const text = buildEmailText(baseReport);
    expect(text).toContain("Oposições: 4");
    expect(text).toContain("Deferimentos: 10");
  });

  it("mostra marcas semelhantes como 0 quando o modulo nao encontrou nada (nao inventa dado)", () => {
    const text = buildEmailText(baseReport);
    expect(text).toContain("Marcas semelhantes relevantes encontradas: 0");
  });
});
