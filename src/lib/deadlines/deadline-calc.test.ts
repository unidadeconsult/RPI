import { describe, expect, it } from "vitest";
import { computeDeadlineUrgency, computeSuggestedDate } from "./deadline-calc";

describe("computeSuggestedDate", () => {
  it("soma dias corridos simples", () => {
    const result = computeSuggestedDate(new Date("2026-07-21T00:00:00Z"), 60, "CORRIDOS");
    expect(result.toISOString().slice(0, 10)).toBe("2026-09-19");
  });

  it("soma dias uteis pulando sabados e domingos", () => {
    // 2026-07-21 e terca-feira
    const result = computeSuggestedDate(new Date("2026-07-21T00:00:00Z"), 5, "UTEIS");
    // ter->qua,qui,sex (3), pula sab/dom, seg,ter (5) = 2026-07-28
    expect(result.toISOString().slice(0, 10)).toBe("2026-07-28");
  });

  it("38. data interna pode ser calculada separadamente pelo chamador (nao e responsabilidade desta funcao)", () => {
    // A funcao so calcula o prazo sugerido; a data interna e um campo
    // independente preenchido pelo usuario (secao 16).
    const result = computeSuggestedDate(new Date("2026-01-01T00:00:00Z"), 0, "CORRIDOS");
    expect(result.toISOString().slice(0, 10)).toBe("2026-01-01");
  });
});

describe("computeDeadlineUrgency", () => {
  const today = new Date("2026-07-21T12:00:00Z");

  it("33. prazo sugerido ainda nao confirmado -- ainda calcula urgencia normalmente", () => {
    expect(computeDeadlineUrgency(new Date("2026-08-25T00:00:00Z"), today)).toBe("NORMAL");
  });

  it("36. prazo vencido", () => {
    expect(computeDeadlineUrgency(new Date("2026-07-10T00:00:00Z"), today)).toBe("VENCIDO");
  });

  it("vence hoje", () => {
    expect(computeDeadlineUrgency(new Date("2026-07-21T00:00:00Z"), today)).toBe("HOJE");
  });

  it("vence em 3 dias", () => {
    expect(computeDeadlineUrgency(new Date("2026-07-24T00:00:00Z"), today)).toBe("URGENTE_3");
  });

  it("vence em 7 dias", () => {
    expect(computeDeadlineUrgency(new Date("2026-07-28T00:00:00Z"), today)).toBe("URGENTE_7");
  });

  it("vence em 15 dias", () => {
    expect(computeDeadlineUrgency(new Date("2026-08-05T00:00:00Z"), today)).toBe("ATENCAO_15");
  });

  it("vence em 30 dias", () => {
    expect(computeDeadlineUrgency(new Date("2026-08-19T00:00:00Z"), today)).toBe("ATENCAO_30");
  });

  it("sem data retorna SEM_DATA", () => {
    expect(computeDeadlineUrgency(null, today)).toBe("SEM_DATA");
  });
});
