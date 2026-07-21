import { describe, expect, it } from "vitest";
import { splitHolders } from "./holder-splitter";

describe("splitHolders", () => {
  it("titular unico simples", () => {
    expect(splitHolders(["CONSTRUTORA SANTO ANTONIO LTDA. (BR/PE)"])).toEqual([
      { nameRaw: "CONSTRUTORA SANTO ANTONIO LTDA. (BR/PE)", cpfCnpj: null, uf: "PE" },
    ]);
  });

  it("titular com documento (CPF/CNPJ parcial) prefixado", () => {
    expect(
      splitHolders(["66.022.363 PAULO SEBASTIAO DA SILVA JUNIOR (BR/PE)"]),
    ).toEqual([
      {
        nameRaw: "PAULO SEBASTIAO DA SILVA JUNIOR (BR/PE)",
        cpfCnpj: "66.022.363",
        uf: "PE",
      },
    ]);
  });

  it("multiplos co-titulares em estados diferentes, em uma linha", () => {
    const result = splitHolders([
      "ALBERTO FALÃO DE SOUSA (BR/SC), ELVIS DA SILVA LOPES (BR/SP), MURILO ALVES (BR/PE)",
    ]);
    expect(result).toEqual([
      { nameRaw: "ALBERTO FALÃO DE SOUSA (BR/SC)", cpfCnpj: null, uf: "SC" },
      { nameRaw: "ELVIS DA SILVA LOPES (BR/SP)", cpfCnpj: null, uf: "SP" },
      { nameRaw: "MURILO ALVES (BR/PE)", cpfCnpj: null, uf: "PE" },
    ]);
  });

  it("titular longo dividido em duas linhas fisicas", () => {
    const result = splitHolders([
      "COOPERATIVA DOS PRODUTORES EXPORTADORES DO VALE DO SÃO",
      "FRANCISCO (BR/PE)",
    ]);
    expect(result).toEqual([
      {
        nameRaw: "COOPERATIVA DOS PRODUTORES EXPORTADORES DO VALE DO SÃO FRANCISCO (BR/PE)",
        cpfCnpj: null,
        uf: "PE",
      },
    ]);
  });

  it("co-titulares divididos entre duas linhas (virgula pendurada)", () => {
    const result = splitHolders([
      "PADRÃO ATACADISTA DE PRODUTOS PARA A SAÚDE LTDA (BR/PE),",
      "PADRÃO DIST PROD E EQUIP HOSPITALARES PE CALLOU LTDA (BR/PE)",
    ]);
    expect(result).toEqual([
      { nameRaw: "PADRÃO ATACADISTA DE PRODUTOS PARA A SAÚDE LTDA (BR/PE)", cpfCnpj: null, uf: "PE" },
      {
        nameRaw: "PADRÃO DIST PROD E EQUIP HOSPITALARES PE CALLOU LTDA (BR/PE)",
        cpfCnpj: null,
        uf: "PE",
      },
    ]);
  });

  it("lista vazia retorna vazio", () => {
    expect(splitHolders([])).toEqual([]);
  });

  it("titular sem sufixo de UF reconhecivel preserva o texto bruto", () => {
    expect(splitHolders(["NOME SEM SUFIXO DE ESTADO"])).toEqual([
      { nameRaw: "NOME SEM SUFIXO DE ESTADO", cpfCnpj: null, uf: null },
    ]);
  });
});
