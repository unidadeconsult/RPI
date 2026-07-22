import { describe, expect, it } from "vitest";
import { compareRpiVersions } from "./rpi-correction-comparison";

describe("compareRpiVersions", () => {
  it("identifica publicacoes incluidas na nova versao", () => {
    const result = compareRpiVersions(
      [{ processNumber: "111", dispatchCode: "I029" }],
      [
        { processNumber: "111", dispatchCode: "I029" },
        { processNumber: "222", dispatchCode: "I060" },
      ],
    );
    expect(result.addedCount).toBe(1);
    expect(result.details).toContainEqual({
      processNumber: "222",
      status: "ADICIONADA",
      previousDispatchCode: null,
      newDispatchCode: "I060",
    });
  });

  it("identifica publicacoes removidas na nova versao", () => {
    const result = compareRpiVersions(
      [
        { processNumber: "111", dispatchCode: "I029" },
        { processNumber: "222", dispatchCode: "I060" },
      ],
      [{ processNumber: "111", dispatchCode: "I029" }],
    );
    expect(result.removedCount).toBe(1);
    expect(result.details).toContainEqual({
      processNumber: "222",
      status: "REMOVIDA",
      previousDispatchCode: "I060",
      newDispatchCode: null,
    });
  });

  it("identifica publicacoes alteradas (mesmo processo, despacho diferente)", () => {
    const result = compareRpiVersions(
      [{ processNumber: "111", dispatchCode: "I029" }],
      [{ processNumber: "111", dispatchCode: "I009" }],
    );
    expect(result.changedCount).toBe(1);
    expect(result.details).toContainEqual({
      processNumber: "111",
      status: "ALTERADA",
      previousDispatchCode: "I029",
      newDispatchCode: "I009",
    });
  });

  it("nao gera entrada quando nada mudou", () => {
    const result = compareRpiVersions(
      [{ processNumber: "111", dispatchCode: "I029" }],
      [{ processNumber: "111", dispatchCode: "I029" }],
    );
    expect(result.addedCount).toBe(0);
    expect(result.removedCount).toBe(0);
    expect(result.changedCount).toBe(0);
    expect(result.details).toEqual([]);
  });
});
