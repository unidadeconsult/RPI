import { describe, expect, it } from "vitest";
import { buildPublicationHash } from "./publication-hash";

describe("buildPublicationHash", () => {
  const base = {
    rpiNumber: "2800",
    rpiDate: "2026-07-21",
    processNumber: "923456789",
    dispatchCode: "IPAS021",
    description: "Publicacao de pedido",
    trademarkName: "MARCA EXEMPLO",
    holderName: "EMPRESA EXEMPLO LTDA",
    attorneyName: "JANE GLAUCIA VIEIRA",
  };

  it("gera o mesmo hash para os mesmos dados", () => {
    expect(buildPublicationHash(base)).toBe(buildPublicationHash({ ...base }));
  });

  it("gera hashes diferentes quando um campo muda", () => {
    const changed = { ...base, processNumber: "111111111" };
    expect(buildPublicationHash(base)).not.toBe(buildPublicationHash(changed));
  });

  it("e insensivel a variacao de acentuacao/maiusculas nos campos textuais", () => {
    const accented = { ...base, trademarkName: "Márca Exemplo" };
    expect(buildPublicationHash(base)).toBe(buildPublicationHash(accented));
  });

  it("nao quebra quando campos opcionais estao ausentes", () => {
    expect(() =>
      buildPublicationHash({ rpiNumber: "2800", rpiDate: "2026-07-21" }),
    ).not.toThrow();
  });
});
