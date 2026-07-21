import { describe, expect, it } from "vitest";
import type { PositionedTextItem } from "./apol-pdf-text";
import {
  detectRpiNumberFromItems,
  extractHolderUfs,
  groupApolPdfRecords,
  parseNiceClasses,
} from "./apol-pdf-parser";

const FLAG_X = 40;
const PROC_X = 67;
const BODY_X = 125;
const CLASSES_X = 450;
const DESPACHO_X = 527;

let yCounter = 1000;
function nextY(): number {
  yCounter -= 10;
  return yCounter;
}

function bold(page: number, x: number, y: number, text: string): PositionedTextItem {
  return { page, x, y, text, bold: true };
}
function plain(page: number, x: number, y: number, text: string): PositionedTextItem {
  return { page, x, y, text, bold: false };
}

describe("groupApolPdfRecords", () => {
  it("registro com marca, titular inline e procurador (caso JANE GLAUCIA VIEIRA)", () => {
    const yMarca = nextY();
    const yRow = nextY();
    const yProcurador = nextY();

    const items: PositionedTextItem[] = [
      bold(6, BODY_X, yMarca, "CONSTRUTORA SANTO ANTONIO"),
      bold(6, FLAG_X, yRow, "M"),
      plain(6, PROC_X, yRow, "936584432"),
      plain(6, BODY_X, yRow, "CONSTRUTORA SANTO ANTONIO LTDA. (BR/PE)"),
      plain(6, CLASSES_X, yRow, "NCL(12) 36"),
      plain(6, DESPACHO_X, yRow, "I029"),
      plain(6, BODY_X, yProcurador, "JANE GLAUCIA VIEIRA"),
    ];

    const records = groupApolPdfRecords(items);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      processNumber: "936584432",
      presentationFlag: "M",
      trademarkName: "CONSTRUTORA SANTO ANTONIO",
      holderLines: ["CONSTRUTORA SANTO ANTONIO LTDA. (BR/PE)"],
      attorneyLines: ["JANE GLAUCIA VIEIRA"],
      classesRaw: "NCL(12) 36",
      dispatchCode: "I029",
    });
  });

  it("registro sem marca, titular inline, procurador presente", () => {
    const yRow = nextY();
    const yProcurador = nextY();

    const items: PositionedTextItem[] = [
      bold(1, FLAG_X, yRow, "F"),
      plain(1, PROC_X, yRow, "929919335"),
      plain(1, BODY_X, yRow, "MPC INVEST LTDA (BR/PE)"),
      plain(1, CLASSES_X, yRow, "NCL(12) 42"),
      plain(1, DESPACHO_X, yRow, "I360"),
      plain(1, BODY_X, yProcurador, "SOUZA LEÃO, CAVALCANTI E FONTES ADVOGADOS"),
    ];

    const records = groupApolPdfRecords(items);
    expect(records).toHaveLength(1);
    expect(records[0].trademarkName).toBeNull();
    expect(records[0].holderLines).toEqual(["MPC INVEST LTDA (BR/PE)"]);
    expect(records[0].attorneyLines).toEqual(["SOUZA LEÃO, CAVALCANTI E FONTES ADVOGADOS"]);
  });

  it("registro sem marca, titular na linha seguinte, sem procurador", () => {
    const yRow = nextY();
    const yTitular = nextY();

    const items: PositionedTextItem[] = [
      bold(1, FLAG_X, yRow, "F"),
      plain(1, PROC_X, yRow, "934264392"),
      plain(1, CLASSES_X, yRow, "NCL(12) 25"),
      plain(1, DESPACHO_X, yRow, "I270-3881"),
      plain(1, BODY_X, yTitular, "CORREIA & SILVA CONFECÇÕES LTDA (BR/PE)"),
    ];

    const records = groupApolPdfRecords(items);
    expect(records).toHaveLength(1);
    expect(records[0].holderLines).toEqual(["CORREIA & SILVA CONFECÇÕES LTDA (BR/PE)"]);
    expect(records[0].attorneyLines).toEqual([]);
  });

  it("registro com multiplos titulares (co-titularidade) e procurador", () => {
    const yMarca = nextY();
    const yTitular1 = nextY();
    const yRow = nextY();
    const yTitular2 = nextY();
    const yProcurador = nextY();

    const items: PositionedTextItem[] = [
      bold(1, BODY_X, yMarca, "!Dental Padrão"),
      plain(1, BODY_X, yTitular1, "PADRÃO ATACADISTA DE PRODUTOS PARA A SAÚDE LTDA (BR/PE),"),
      bold(1, FLAG_X, yRow, "M"),
      plain(1, PROC_X, yRow, "935957162"),
      plain(1, CLASSES_X, yRow, "NCL(12) 10"),
      plain(1, DESPACHO_X, yRow, "I029"),
      plain(1, BODY_X, yTitular2, "PADRÃO DIST PROD E EQUIP HOSPITALARES PE CALLOU LTDA (BR/PE)"),
      plain(1, BODY_X, yProcurador, "Somos Marcas e Patentes Ltda"),
    ];

    const records = groupApolPdfRecords(items);
    expect(records).toHaveLength(1);
    expect(records[0].trademarkName).toBe("!Dental Padrão");
    expect(records[0].holderLines).toEqual([
      "PADRÃO ATACADISTA DE PRODUTOS PARA A SAÚDE LTDA (BR/PE),",
      "PADRÃO DIST PROD E EQUIP HOSPITALARES PE CALLOU LTDA (BR/PE)",
    ]);
    expect(records[0].attorneyLines).toEqual(["Somos Marcas e Patentes Ltda"]);
    expect(extractHolderUfs(records[0])).toEqual(["PE"]);
  });

  it("titular longo dividido acima e abaixo da linha-ancora (caso COOPEX VALE)", () => {
    const yMarca = nextY();
    const yTitularPrefixo = nextY();
    const yRow = nextY();
    const yTitularSufixo = nextY();
    const yProcurador = nextY();

    const items: PositionedTextItem[] = [
      bold(6, BODY_X, yMarca, "COOPEX VALE"),
      plain(6, BODY_X, yTitularPrefixo, "COOPERATIVA DOS PRODUTORES EXPORTADORES DO VALE DO SÃO"),
      bold(6, FLAG_X, yRow, "M"),
      plain(6, PROC_X, yRow, "906781795"),
      plain(6, CLASSES_X, yRow, "NCL(10) 31"),
      plain(6, DESPACHO_X, yRow, "I270-3745"),
      plain(6, BODY_X, yTitularSufixo, "FRANCISCO (BR/PE)"),
      plain(6, BODY_X, yProcurador, "DILERMAR RIBEIRO SCHAEWER"),
    ];

    const records = groupApolPdfRecords(items);
    expect(records).toHaveLength(1);
    expect(records[0].trademarkName).toBe("COOPEX VALE");
    expect(records[0].holderLines).toEqual([
      "COOPERATIVA DOS PRODUTORES EXPORTADORES DO VALE DO SÃO",
      "FRANCISCO (BR/PE)",
    ]);
    expect(records[0].attorneyLines).toEqual(["DILERMAR RIBEIRO SCHAEWER"]);
  });

  it("registro sem letra de apresentacao, sem classe (despacho processual) com procurador", () => {
    const yRow = nextY();
    const yProcurador = nextY();

    const items: PositionedTextItem[] = [
      plain(1, PROC_X, yRow, "943363004"),
      plain(1, BODY_X, yRow, "TIAGO GOMES DA SILVA (BR/PE)"),
      plain(1, CLASSES_X, yRow, "/"),
      plain(1, DESPACHO_X, yRow, "I395"),
      plain(1, BODY_X, yProcurador, "WENDERSON TAVARES DA SILVA"),
    ];

    const records = groupApolPdfRecords(items);
    expect(records).toHaveLength(1);
    expect(records[0].presentationFlag).toBeNull();
    expect(records[0].holderLines).toEqual(["TIAGO GOMES DA SILVA (BR/PE)"]);
    expect(records[0].attorneyLines).toEqual(["WENDERSON TAVARES DA SILVA"]);
    expect(parseNiceClasses(records[0].classesRaw)).toEqual([]);
  });

  it("dois registros sequenciais, cada um com seu proprio procurador (nao vaza entre registros)", () => {
    const yMarca1 = nextY();
    const yRow1 = nextY();
    const yProcurador1 = nextY();
    const yMarca2 = nextY();
    const yRow2 = nextY();
    const yProcurador2 = nextY();

    const items: PositionedTextItem[] = [
      bold(6, BODY_X, yMarca1, "CONSTRUTORA SANTO ANTONIO"),
      bold(6, FLAG_X, yRow1, "M"),
      plain(6, PROC_X, yRow1, "936584432"),
      plain(6, BODY_X, yRow1, "CONSTRUTORA SANTO ANTONIO LTDA. (BR/PE)"),
      plain(6, CLASSES_X, yRow1, "NCL(12) 36"),
      plain(6, DESPACHO_X, yRow1, "I029"),
      plain(6, BODY_X, yProcurador1, "JANE GLAUCIA VIEIRA"),

      bold(6, BODY_X, yMarca2, "CONSTRUTORA SANTO ANTÔNIO"),
      bold(6, FLAG_X, yRow2, "M"),
      plain(6, PROC_X, yRow2, "936584181"),
      plain(6, BODY_X, yRow2, "CONSTRUTORA SANTO ANTONIO LTDA. (BR/PE)"),
      plain(6, CLASSES_X, yRow2, "NCL(12) 37"),
      plain(6, DESPACHO_X, yRow2, "I029"),
      plain(6, BODY_X, yProcurador2, "JANE GLAUCIA VIEIRA"),
    ];

    const records = groupApolPdfRecords(items);
    expect(records).toHaveLength(2);
    expect(records[0].processNumber).toBe("936584432");
    expect(records[0].attorneyLines).toEqual(["JANE GLAUCIA VIEIRA"]);
    expect(records[1].processNumber).toBe("936584181");
    expect(records[1].attorneyLines).toEqual(["JANE GLAUCIA VIEIRA"]);
  });
});

describe("codigo de despacho largo desloca o X inicial (regressao real: I270-3881)", () => {
  it("separa classes e despacho mesmo quando o despacho comeca antes do X fixo de 520", () => {
    const yRow = nextY();
    const yTitular = nextY();

    const items: PositionedTextItem[] = [
      bold(1, FLAG_X, yRow, "F"),
      plain(1, PROC_X, yRow, "934264392"),
      plain(1, CLASSES_X, yRow, "NCL(12) 25"),
      // No arquivo real este item aparece em x=515.03 -- mais a esquerda
      // do que o codigo curto "I029" (x=527.39), pois o despacho e
      // alinhado a direita e "I270-3881" e mais largo.
      plain(1, 515.03, yRow, "I270-3881"),
      plain(1, BODY_X, yTitular, "CORREIA & SILVA CONFECÇÕES LTDA (BR/PE)"),
    ];

    const records = groupApolPdfRecords(items);
    expect(records).toHaveLength(1);
    expect(records[0].classesRaw).toBe("NCL(12) 25");
    expect(records[0].dispatchCode).toBe("I270-3881");
  });
});

describe("parseNiceClasses", () => {
  it("extrai o numero da classe do formato NCL(edicao) classe", () => {
    expect(parseNiceClasses("NCL(12) 36")).toEqual(["36"]);
  });

  it("retorna vazio quando nao ha classe ('/')", () => {
    expect(parseNiceClasses("/")).toEqual([]);
  });

  it("retorna vazio quando nulo", () => {
    expect(parseNiceClasses(null)).toEqual([]);
  });
});

describe("extractHolderUfs", () => {
  it("extrai multiplas UFs de titulares em estados diferentes", () => {
    const record = {
      page: 1,
      processNumber: "940648393",
      presentationFlag: "M",
      trademarkName: "123 multas",
      holderLines: [
        "ALBERTO FALÃO DE SOUSA (BR/SC), ELVIS DA SILVA LOPES (BR/SP),",
        "MURILO ALVES (BR/PE)",
      ],
      attorneyLines: ["Alberto Falcão de Sousa"],
      classesRaw: "NCL(12) 35",
      dispatchCode: "I106",
    };
    expect(extractHolderUfs(record).sort()).toEqual(["PE", "SC", "SP"]);
  });
});

describe("detectRpiNumberFromItems", () => {
  it("detecta o numero da RPI no cabecalho do relatorio APOL", () => {
    const items: PositionedTextItem[] = [
      plain(1, 200, 787.92, "Consulta Livre na RPI 2888"),
    ];
    expect(detectRpiNumberFromItems(items)).toBe("2888");
  });

  it("retorna null quando o cabecalho nao e encontrado", () => {
    const items: PositionedTextItem[] = [plain(1, 200, 787.92, "texto qualquer")];
    expect(detectRpiNumberFromItems(items)).toBeNull();
  });

  it("regressao real: cada palavra chega como um item separado na mesma linha", () => {
    const items: PositionedTextItem[] = [
      bold(1, 56.14, 787.92, "Consulta"),
      bold(1, 103.26, 787.92, "Livre"),
      bold(1, 131.44, 787.92, "na"),
      bold(1, 146.94, 787.92, "RPI"),
      bold(1, 168.57, 787.92, "2888"),
    ];
    expect(detectRpiNumberFromItems(items)).toBe("2888");
  });
});
