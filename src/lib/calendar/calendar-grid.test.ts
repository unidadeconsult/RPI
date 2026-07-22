import { describe, expect, it } from "vitest";
import { computeMonthGridDays, computeWeekDays, isSameUtcDay, isSameUtcMonth } from "./calendar-grid";

describe("computeMonthGridDays", () => {
  it("retorna 42 dias (6 semanas)", () => {
    expect(computeMonthGridDays(2026, 6)).toHaveLength(42);
  });

  it("comeca no domingo anterior (ou igual) ao dia 1", () => {
    // Julho de 2026 comeca numa quarta-feira
    const days = computeMonthGridDays(2026, 6);
    expect(days[0].getUTCDay()).toBe(0);
    expect(days[0].getUTCDate()).toBe(28); // domingo 28/06/2026
    expect(days[0].getUTCMonth()).toBe(5);
  });

  it("inclui o primeiro dia do mes na grade", () => {
    const days = computeMonthGridDays(2026, 6);
    const hasFirst = days.some((d) => d.getUTCDate() === 1 && d.getUTCMonth() === 6);
    expect(hasFirst).toBe(true);
  });
});

describe("computeWeekDays", () => {
  it("retorna 7 dias comecando no domingo da semana", () => {
    const days = computeWeekDays(new Date("2026-07-22T00:00:00Z")); // quarta-feira
    expect(days).toHaveLength(7);
    expect(days[0].getUTCDay()).toBe(0);
    expect(days[0].toISOString().slice(0, 10)).toBe("2026-07-19");
  });
});

describe("isSameUtcDay", () => {
  it("compara apenas ano/mes/dia", () => {
    expect(
      isSameUtcDay(new Date("2026-07-21T23:00:00Z"), new Date("2026-07-21T01:00:00Z")),
    ).toBe(true);
    expect(
      isSameUtcDay(new Date("2026-07-21T00:00:00Z"), new Date("2026-07-22T00:00:00Z")),
    ).toBe(false);
  });
});

describe("isSameUtcMonth", () => {
  it("compara mes e ano", () => {
    expect(isSameUtcMonth(new Date("2026-07-15T00:00:00Z"), 6, 2026)).toBe(true);
    expect(isSameUtcMonth(new Date("2026-06-15T00:00:00Z"), 6, 2026)).toBe(false);
  });
});
