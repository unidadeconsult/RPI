import { describe, expect, it } from "vitest";
import { renderMessageTemplate } from "./template-render";

describe("renderMessageTemplate", () => {
  it("44. preenche as variaveis fornecidas", () => {
    const result = renderMessageTemplate(
      "Prezado(a) {{cliente}}, a marca {{marca}} (processo {{processo}}) recebeu o despacho {{despacho}}.",
      { cliente: "Empresa X", marca: "ACME", processo: "123456789", despacho: "I029" },
    );
    expect(result).toBe(
      "Prezado(a) Empresa X, a marca ACME (processo 123456789) recebeu o despacho I029.",
    );
  });

  it("sinaliza variavel nao informada em vez de deixar em branco silenciosamente", () => {
    const result = renderMessageTemplate("Responsável: {{responsavel}}", {});
    expect(result).toBe("Responsável: [responsável pelo atendimento não informado]");
  });

  it("preserva chaves desconhecidas sem quebrar", () => {
    const result = renderMessageTemplate("Texto {{campo_inexistente}} fim", {});
    expect(result).toBe("Texto {{campo_inexistente}} fim");
  });

  it("nao altera texto sem variaveis", () => {
    expect(renderMessageTemplate("Texto fixo", {})).toBe("Texto fixo");
  });
});
