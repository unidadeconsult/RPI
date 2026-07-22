import { describe, expect, it } from "vitest";
import { computeAverageReviewHours } from "./management-data";

describe("computeAverageReviewHours", () => {
  it("retorna null quando nao ha publicacoes revisadas (nao inventa numero)", () => {
    expect(computeAverageReviewHours([])).toBeNull();
  });

  it("calcula a media em horas entre criacao e revisao", () => {
    const result = computeAverageReviewHours([
      { createdAt: new Date("2026-07-20T00:00:00Z"), reviewedAt: new Date("2026-07-20T02:00:00Z") },
      { createdAt: new Date("2026-07-20T00:00:00Z"), reviewedAt: new Date("2026-07-20T06:00:00Z") },
    ]);
    expect(result).toBe(4);
  });
});
