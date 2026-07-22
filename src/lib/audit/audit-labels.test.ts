import { describe, expect, it } from "vitest";
import { buildAuditEntityHref, describeAuditAction } from "./audit-labels";

describe("describeAuditAction", () => {
  it("traduz uma acao conhecida", () => {
    expect(describeAuditAction("CREATE_TASK")).toBe("Tarefa criada");
  });

  it("devolve a acao crua quando nao ha rotulo (nao inventa descricao)", () => {
    expect(describeAuditAction("ACAO_DESCONHECIDA_X")).toBe("ACAO_DESCONHECIDA_X");
  });
});

describe("buildAuditEntityHref", () => {
  it("monta o link para um tipo de entidade conhecido", () => {
    expect(buildAuditEntityHref("Task", "abc123")).toBe("/tasks/abc123");
  });

  it("retorna null quando o tipo de entidade nao tem tela de destino conhecida", () => {
    expect(buildAuditEntityHref("RpiEdition", "abc123")).toBeNull();
  });

  it("retorna null quando nao ha entityId", () => {
    expect(buildAuditEntityHref("Task", null)).toBeNull();
  });
});
