import { describe, expect, it } from "vitest";
import type { ApolPdfRecord } from "@/lib/parser/apol-pdf-parser";
import { buildPublicationDraft } from "./build-publication-draft";

const context = { rpiNumber: "2888", rpiDate: "2026-07-21" };

function record(overrides: Partial<ApolPdfRecord>): ApolPdfRecord {
  return {
    page: 6,
    processNumber: "936584432",
    presentationFlag: "M",
    trademarkName: "CONSTRUTORA SANTO ANTONIO",
    holderLines: ["CONSTRUTORA SANTO ANTONIO LTDA. (BR/PE)"],
    attorneyLines: ["JANE GLAUCIA VIEIRA"],
    classesRaw: "NCL(12) 36",
    dispatchCode: "I029",
    ...overrides,
  };
}

describe("buildPublicationDraft", () => {
  it("constroi o rascunho quando Jane e confirmada como procuradora", () => {
    const draft = buildPublicationDraft(record({}), context);
    expect(draft).not.toBeNull();
    expect(draft?.attorneys).toEqual([
      { nameRaw: "JANE GLAUCIA VIEIRA", normalizedName: "JANE GLAUCIA VIEIRA", matchStatus: "CONFIRMADO" },
    ]);
    expect(draft?.holders).toEqual([
      { nameRaw: "CONSTRUTORA SANTO ANTONIO LTDA. (BR/PE)", cpfCnpj: null, uf: "PE" },
    ]);
    expect(draft?.peStatus).toBe("CONFIRMADO_PE");
    expect(draft?.niceClasses).toEqual(["36"]);
  });

  it("retorna null quando o procurador nao e Jane", () => {
    const draft = buildPublicationDraft(
      record({ attorneyLines: ["SOUZA LEÃO, CAVALCANTI E FONTES ADVOGADOS"] }),
      context,
    );
    expect(draft).toBeNull();
  });

  it("retorna null quando nao ha nenhum procurador no registro", () => {
    const draft = buildPublicationDraft(record({ attorneyLines: [] }), context);
    expect(draft).toBeNull();
  });

  it("gera hash estavel e diferente entre processos diferentes", () => {
    const d1 = buildPublicationDraft(record({}), context);
    const d2 = buildPublicationDraft(record({ processNumber: "999999999" }), context);
    expect(d1?.publicationHash).not.toBe(d2?.publicationHash);
  });

  it("titular fora de PE resulta em CONFIRMADO_OUTRO_ESTADO", () => {
    const draft = buildPublicationDraft(
      record({ holderLines: ["EMPRESA EXEMPLO LTDA (BR/SP)"] }),
      context,
    );
    expect(draft?.peStatus).toBe("CONFIRMADO_OUTRO_ESTADO");
  });

  it("nome com abreviacao nao cadastrada nao gera rascunho", () => {
    const draft = buildPublicationDraft(record({ attorneyLines: ["JANE G. VIEIRA"] }), context);
    expect(draft).toBeNull();
  });

  it("alias cadastrado pelo administrador confirma a publicacao", () => {
    const draft = buildPublicationDraft(record({ attorneyLines: ["JANE G. VIEIRA"] }), {
      ...context,
      registeredAliasesNormalized: ["JANE G VIEIRA"],
    });
    expect(draft?.attorneys[0].matchStatus).toBe("CONFIRMADO");
  });
});
