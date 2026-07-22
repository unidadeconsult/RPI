import { describe, expect, it } from "vitest";
import { rankBySeverity, type InconsistencyAlert } from "./inconsistency-checks";

function alert(id: string, severity: InconsistencyAlert["severity"]): InconsistencyAlert {
  return { id, severity, title: id, description: id, count: 1 };
}

describe("rankBySeverity", () => {
  it("ordena ALTA antes de MEDIA antes de BAIXA", () => {
    const result = rankBySeverity([alert("b", "BAIXA"), alert("a", "ALTA"), alert("m", "MEDIA")]);
    expect(result.map((a) => a.id)).toEqual(["a", "m", "b"]);
  });

  it("nao muta o array original", () => {
    const input = [alert("b", "BAIXA"), alert("a", "ALTA")];
    rankBySeverity(input);
    expect(input[0].id).toBe("b");
  });
});
