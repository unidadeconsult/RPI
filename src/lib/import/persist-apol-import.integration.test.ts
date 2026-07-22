import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { ApolPdfRecord } from "@/lib/parser/apol-pdf-parser";
import { persistApolImport } from "./persist-apol-import";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://rpi_app:rpi_dev_password@localhost:5432/rpi_manager_test?schema=public";

const adapter = new PrismaPg({ connectionString: TEST_DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const TEST_USER_EMAIL = "teste-persist-apol@rpimanager.local";

function janeRecord(overrides: Partial<ApolPdfRecord> = {}): ApolPdfRecord {
  return {
    page: 1,
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

function otherAttorneyRecord(overrides: Partial<ApolPdfRecord> = {}): ApolPdfRecord {
  return {
    page: 1,
    processNumber: "934264392",
    presentationFlag: "F",
    trademarkName: null,
    holderLines: ["CORREIA & SILVA CONFECÇÕES LTDA (BR/PE)"],
    attorneyLines: ["SOUZA LEÃO, CAVALCANTI E FONTES ADVOGADOS"],
    classesRaw: "NCL(12) 25",
    dispatchCode: "I270-3881",
    ...overrides,
  };
}

let testUserId: string;

beforeAll(async () => {
  const user = await prisma.user.upsert({
    where: { email: TEST_USER_EMAIL },
    update: {},
    create: {
      name: "Teste Persist APOL",
      email: TEST_USER_EMAIL,
      passwordHash: "unused-in-tests",
      role: "ADMINISTRADOR",
    },
  });
  testUserId = user.id;
});

afterAll(async () => {
  await prisma.publicationAttorney.deleteMany({});
  await prisma.party.deleteMany({});
  await prisma.trademarkClass.deleteMany({});
  await prisma.trademark.deleteMany({});
  await prisma.publication.deleteMany({});
  await prisma.proceeding.deleteMany({
    where: {
      processNumber: {
        in: [
          "936584432",
          "934264392",
          "999999991",
          "999999992",
          "999999993",
          "999999994",
        ],
      },
    },
  });
  await prisma.attorney.deleteMany({ where: { normalizedName: { contains: "JANE" } } });
  await prisma.auditLog.deleteMany({ where: { userId: testUserId } });
  await prisma.rpiEditionComparison.deleteMany({});
  await prisma.rpiFile.deleteMany({});
  await prisma.rpiEdition.deleteMany({ where: { number: { startsWith: "TESTE-" } } });
  await prisma.user.deleteMany({ where: { email: TEST_USER_EMAIL } });
  await prisma.$disconnect();
});

describe("persistApolImport", () => {
  it("importa apenas as publicacoes com Jane confirmada, ignorando as demais", async () => {
    const result = await persistApolImport(prisma, {
      records: [janeRecord(), otherAttorneyRecord()],
      rpiNumber: "TESTE-0001",
      rpiDate: new Date("2026-07-21T00:00:00Z"),
      fileBuffer: Buffer.from("conteudo de teste 1"),
      originalFilename: "teste1.pdf",
      uploadedByUserId: testUserId,
    });

    expect(result.status).toBe("IMPORTADO");
    if (result.status !== "IMPORTADO") throw new Error("unreachable");
    expect(result.totalRecordsParsed).toBe(2);
    expect(result.totalConfirmados).toBe(1);
    expect(result.isCorrection).toBe(false);

    const publications = await prisma.publication.findMany({
      where: { rpiEditionId: result.rpiEditionId },
      include: { attorneyLinks: { include: { attorney: true } }, parties: true },
    });
    expect(publications).toHaveLength(1);
    expect(publications[0].processNumberRaw).toBe("936584432");
    expect(publications[0].attorneyLinks[0].attorney.normalizedName).toBe(
      "JANE GLAUCIA VIEIRA",
    );
    expect(publications[0].attorneyLinks[0].matchStatus).toBe("CONFIRMADO");
    expect(publications[0].parties[0].name).toBe("CONSTRUTORA SANTO ANTONIO LTDA. (BR/PE)");
    expect(publications[0].peStatus).toBe("CONFIRMADO_PE");
  });

  it("bloqueia importacao duplicada do mesmo arquivo", async () => {
    const buffer = Buffer.from("conteudo de teste duplicado");
    const first = await persistApolImport(prisma, {
      records: [janeRecord({ processNumber: "999999991" })],
      rpiNumber: "TESTE-0002",
      rpiDate: new Date("2026-07-21T00:00:00Z"),
      fileBuffer: buffer,
      originalFilename: "teste-dup.pdf",
      uploadedByUserId: testUserId,
    });
    expect(first.status).toBe("IMPORTADO");

    const second = await persistApolImport(prisma, {
      records: [janeRecord({ processNumber: "999999991" })],
      rpiNumber: "TESTE-0002",
      rpiDate: new Date("2026-07-21T00:00:00Z"),
      fileBuffer: buffer,
      originalFilename: "teste-dup.pdf",
      uploadedByUserId: testUserId,
    });
    expect(second.status).toBe("DUPLICADO");
  });

  it("24. mesmo processo com multiplos despachos: publicacoes distintas compartilham o mesmo Proceeding", async () => {
    const first = await persistApolImport(prisma, {
      records: [janeRecord({ processNumber: "999999994", dispatchCode: "I029" })],
      rpiNumber: "TESTE-0005",
      rpiDate: new Date("2026-07-21T00:00:00Z"),
      fileBuffer: Buffer.from("despacho 1"),
      originalFilename: "teste-despacho1.pdf",
      uploadedByUserId: testUserId,
    });
    expect(first.status).toBe("IMPORTADO");

    const second = await persistApolImport(prisma, {
      records: [janeRecord({ processNumber: "999999994", dispatchCode: "I060" })],
      rpiNumber: "TESTE-0006",
      rpiDate: new Date("2026-07-28T00:00:00Z"),
      fileBuffer: Buffer.from("despacho 2"),
      originalFilename: "teste-despacho2.pdf",
      uploadedByUserId: testUserId,
    });
    expect(second.status).toBe("IMPORTADO");

    const publications = await prisma.publication.findMany({
      where: { processNumberRaw: "999999994" },
      include: { dispatchCode: true },
    });
    expect(publications).toHaveLength(2);
    expect(new Set(publications.map((p) => p.proceedingId)).size).toBe(1);
    expect(new Set(publications.map((p) => p.dispatchCode?.code)).size).toBe(2);
  });

  it("nova versao da mesma RPI marca a anterior como SUBSTITUIDA", async () => {
    const first = await persistApolImport(prisma, {
      records: [janeRecord({ processNumber: "999999992" })],
      rpiNumber: "TESTE-0003",
      rpiDate: new Date("2026-07-21T00:00:00Z"),
      fileBuffer: Buffer.from("versao 1"),
      originalFilename: "teste-v1.pdf",
      uploadedByUserId: testUserId,
    });
    expect(first.status).toBe("IMPORTADO");
    if (first.status !== "IMPORTADO") throw new Error("unreachable");

    const second = await persistApolImport(prisma, {
      records: [janeRecord({ processNumber: "999999992", dispatchCode: "I009" })],
      rpiNumber: "TESTE-0003",
      rpiDate: new Date("2026-07-28T00:00:00Z"),
      fileBuffer: Buffer.from("versao 2 (corrigida)"),
      originalFilename: "teste-v2.pdf",
      uploadedByUserId: testUserId,
    });
    expect(second.status).toBe("IMPORTADO");
    if (second.status !== "IMPORTADO") throw new Error("unreachable");
    expect(second.isCorrection).toBe(true);

    const previousEdition = await prisma.rpiEdition.findUnique({
      where: { id: first.rpiEditionId },
    });
    expect(previousEdition?.status).toBe("SUBSTITUIDA");
  });

  it("codigo de despacho desconhecido nao descarta a publicacao (OUTROS/NAO CLASSIFICADO)", async () => {
    const result = await persistApolImport(prisma, {
      records: [janeRecord({ processNumber: "999999993", dispatchCode: "ICODIGO-INEDITO" })],
      rpiNumber: "TESTE-0004",
      rpiDate: new Date("2026-07-21T00:00:00Z"),
      fileBuffer: Buffer.from("codigo desconhecido"),
      originalFilename: "teste-desconhecido.pdf",
      uploadedByUserId: testUserId,
    });
    expect(result.status).toBe("IMPORTADO");
    if (result.status !== "IMPORTADO") throw new Error("unreachable");
    expect(result.totalCodigosDesconhecidos).toBe(1);

    const publication = await prisma.publication.findFirst({
      where: { rpiEditionId: result.rpiEditionId },
    });
    expect(publication?.category).toBe("OUTROS_NAO_CLASSIFICADO");
    expect(publication?.categoryIsUnknownCode).toBe(true);
  });
});
