import { createHash } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import type { PrismaClient } from "@/generated/prisma/client";
import type { ApolPdfRecord } from "@/lib/parser/apol-pdf-parser";
import { classifyDispatchCode, type DispatchRuleLookup } from "@/lib/parser/dispatch-classifier";
import { buildPublicationDraft, renderSourceExcerpt } from "./build-publication-draft";

const STORAGE_ROOT = path.resolve(process.cwd(), "storage", "rpi-files");

export type PersistApolImportParams = {
  records: ApolPdfRecord[];
  rpiNumber: string;
  rpiDate: Date;
  fileBuffer: Buffer;
  originalFilename: string;
  uploadedByUserId: string;
};

export type PersistApolImportResult =
  | { status: "DUPLICADO"; existingRpiFileId: string }
  | {
      status: "IMPORTADO";
      rpiEditionId: string;
      rpiFileId: string;
      isCorrection: boolean;
      totalRecordsParsed: number;
      totalConfirmados: number;
      totalDuvidosos: number;
      totalConfirmadosPe: number;
      totalLocalizacaoNaoConfirmada: number;
      totalCodigosDesconhecidos: number;
      publicationsSkippedAsDuplicate: number;
    };

/**
 * Persiste o resultado do parser APOL no banco: cria a edicao/arquivo da
 * RPI e, para cada registro em que JANE GLAUCIA VIEIRA foi confirmada ou
 * ficou duvidosa como procuradora, cria processo/marca/titulares/
 * procurador/publicacao. Registros sem nenhuma correspondencia com o
 * nome-alvo nao sao persistidos (o escopo do sistema e localizar os
 * processos dela, nao armazenar a RPI inteira -- secao 2).
 */
export async function persistApolImport(
  prisma: PrismaClient,
  params: PersistApolImportParams,
): Promise<PersistApolImportResult> {
  const fileHash = createHash("sha256").update(params.fileBuffer).digest("hex");

  const existingFile = await prisma.rpiFile.findUnique({ where: { fileHash } });
  if (existingFile) {
    return { status: "DUPLICADO", existingRpiFileId: existingFile.id };
  }

  const registeredAliases = await prisma.attorneyNameAlias.findMany({
    where: { active: true },
    select: { aliasNormalized: true },
  });
  const registeredAliasesNormalized = registeredAliases.map((a) => a.aliasNormalized);

  const drafts = params.records
    .map((record) =>
      buildPublicationDraft(record, {
        rpiNumber: params.rpiNumber,
        rpiDate: params.rpiDate.toISOString(),
        registeredAliasesNormalized,
      }),
    )
    .filter((draft): draft is NonNullable<typeof draft> => draft !== null);

  await mkdir(STORAGE_ROOT, { recursive: true });
  const storagePath = path.join(STORAGE_ROOT, `${fileHash}.pdf`);
  await writeFile(storagePath, params.fileBuffer);

  const dispatchRulesRows = await prisma.dispatchRule.findMany({
    include: { dispatchCode: true },
  });
  const dispatchRules = new Map<string, DispatchRuleLookup>(
    dispatchRulesRows.map((rule) => [
      rule.dispatchCode.code,
      { mainCategory: rule.mainCategory, subcategory: rule.subcategory },
    ]),
  );

  const result = await prisma.$transaction(async (tx) => {
    const previousLatest = await tx.rpiEdition.findFirst({
      where: { number: params.rpiNumber },
      orderBy: { versionLabel: "desc" },
    });

    const rpiEdition = await tx.rpiEdition.create({
      data: {
        number: params.rpiNumber,
        publicationDate: params.rpiDate,
        versionLabel: (previousLatest?.versionLabel ?? 0) + 1,
        previousVersionId: previousLatest?.id ?? null,
        importedById: params.uploadedByUserId,
      },
    });

    if (previousLatest) {
      await tx.rpiEdition.update({
        where: { id: previousLatest.id },
        data: { status: "SUBSTITUIDA" },
      });
    }

    const rpiFile = await tx.rpiFile.create({
      data: {
        rpiEditionId: rpiEdition.id,
        fileType: "PDF",
        originalFilename: params.originalFilename,
        storagePath,
        fileHash,
        sizeBytes: params.fileBuffer.byteLength,
        uploadedById: params.uploadedByUserId,
        textExtractable: true,
      },
    });

    let totalConfirmados = 0;
    let totalDuvidosos = 0;
    let totalConfirmadosPe = 0;
    let totalLocalizacaoNaoConfirmada = 0;
    let totalCodigosDesconhecidos = 0;
    let publicationsSkippedAsDuplicate = 0;

    for (const draft of drafts) {
      const alreadyExists = await tx.publication.findUnique({
        where: { publicationHash: draft.publicationHash },
      });
      if (alreadyExists) {
        publicationsSkippedAsDuplicate += 1;
        continue;
      }

      const dispatchCode = draft.dispatchCodeRaw
        ? await tx.dispatchCode.upsert({
            where: { code: draft.dispatchCodeRaw },
            update: {},
            create: { code: draft.dispatchCodeRaw },
          })
        : null;

      const classification = classifyDispatchCode(draft.dispatchCodeRaw, dispatchRules);
      if (classification.isUnknownCode) totalCodigosDesconhecidos += 1;

      const proceeding = await tx.proceeding.upsert({
        where: { processNumber: draft.processNumber },
        update: {},
        create: { processNumber: draft.processNumber },
      });

      let trademark = await tx.trademark.findFirst({ where: { proceedingId: proceeding.id } });
      if (!trademark && draft.trademarkName) {
        trademark = await tx.trademark.create({
          data: {
            proceedingId: proceeding.id,
            name: draft.trademarkName,
            presentationType: draft.presentationFlag,
          },
        });
        for (const niceClass of draft.niceClasses) {
          await tx.trademarkClass.create({
            data: { trademarkId: trademark.id, niceClass },
          });
        }
      }

      const hasConfirmedAttorney = draft.attorneys.some((a) => a.matchStatus === "CONFIRMADO");
      if (hasConfirmedAttorney) totalConfirmados += 1;
      else totalDuvidosos += 1;

      if (draft.peStatus === "CONFIRMADO_PE") totalConfirmadosPe += 1;
      if (draft.peStatus === "NAO_CONFIRMADO_REVISAR") totalLocalizacaoNaoConfirmada += 1;

      const publication = await tx.publication.create({
        data: {
          rpiEditionId: rpiEdition.id,
          rpiFileId: rpiFile.id,
          publicationHash: draft.publicationHash,
          proceedingId: proceeding.id,
          processNumberRaw: draft.processNumber,
          dispatchCodeId: dispatchCode?.id ?? null,
          category: classification.category,
          subcategory: classification.subcategory,
          categoryIsUnknownCode: classification.isUnknownCode,
          locationRaw: draft.holders.map((h) => h.nameRaw).join("; ") || null,
          locationUf: draft.holders.find((h) => h.uf)?.uf ?? null,
          peStatus: draft.peStatus,
          peSourceExcerpt: draft.peSourceExcerpt,
          sourceExcerpt: renderSourceExcerpt({
            page: draft.pdfPage,
            processNumber: draft.processNumber,
            presentationFlag: draft.presentationFlag,
            trademarkName: draft.trademarkName,
            holderLines: draft.holders.map((h) => h.nameRaw),
            attorneyLines: draft.attorneys.map((a) => a.nameRaw),
            classesRaw: null,
            dispatchCode: draft.dispatchCodeRaw,
          }),
          pdfPageNumber: draft.pdfPage,
          extractionSource: "PDF_TEXTO",
          confidenceLevel: "MEDIA",
          confidenceReason:
            "Extraido de PDF pesquisavel (relatorio APOL); posicao/negrito usados para inferir o campo, sem tags explicitas.",
          reviewStatus: "NAO_REVISADO",
          importedById: params.uploadedByUserId,
        },
      });

      for (const holder of draft.holders) {
        await tx.party.create({
          data: {
            publicationId: publication.id,
            proceedingId: proceeding.id,
            role: "TITULAR",
            name: holder.nameRaw,
            cpfCnpj: holder.cpfCnpj,
          },
        });
      }

      for (const attorney of draft.attorneys) {
        const attorneyRow = await tx.attorney.upsert({
          where: { normalizedName: attorney.normalizedName },
          update: {},
          create: { nameRaw: attorney.nameRaw, normalizedName: attorney.normalizedName },
        });

        await tx.publicationAttorney.create({
          data: {
            publicationId: publication.id,
            attorneyId: attorneyRow.id,
            isTargetMatch: true,
            matchStatus: attorney.matchStatus,
            confidenceLevel: "MEDIA",
            sourceFieldTag: "procurador (posição inferida no relatório APOL)",
            sourceExcerpt: attorney.nameRaw,
          },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        userId: params.uploadedByUserId,
        action: "IMPORT_RPI",
        entityType: "RpiEdition",
        entityId: rpiEdition.id,
        newValue: {
          rpiNumber: params.rpiNumber,
          rpiDate: params.rpiDate.toISOString(),
          totalRecordsParsed: params.records.length,
          totalConfirmados,
          totalDuvidosos,
        },
      },
    });

    return {
      rpiEditionId: rpiEdition.id,
      rpiFileId: rpiFile.id,
      isCorrection: Boolean(previousLatest),
      totalConfirmados,
      totalDuvidosos,
      totalConfirmadosPe,
      totalLocalizacaoNaoConfirmada,
      totalCodigosDesconhecidos,
      publicationsSkippedAsDuplicate,
    };
  });

  return {
    status: "IMPORTADO",
    ...result,
    totalRecordsParsed: params.records.length,
  };
}
