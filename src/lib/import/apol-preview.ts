import type { PrismaClient } from "@/generated/prisma/client";
import { extractPositionedTextFromPdf } from "@/lib/parser/apol-pdf-text";
import {
  detectRpiNumberFromItems,
  groupApolPdfRecords,
} from "@/lib/parser/apol-pdf-parser";
import { buildPublicationDraft } from "./build-publication-draft";

export type ApolImportPreview = {
  detectedRpiNumber: string | null;
  totalRecords: number;
  totalConfirmados: number;
  totalDuvidosos: number;
  totalConfirmadosPe: number;
  totalLocalizacaoNaoConfirmada: number;
  confirmados: Array<{
    processNumber: string;
    trademarkName: string | null;
    holders: string[];
    peStatus: string;
    matchStatus: string;
  }>;
};

/**
 * Gera o resumo de pre-importacao (secao 5) sem gravar nada no banco.
 * A data de publicacao ainda nao e conhecida neste ponto (o usuario
 * confirma depois), entao o hash de deduplicacao aqui e apenas
 * informativo -- a deduplicacao definitiva acontece em persistApolImport.
 */
export async function buildApolPreview(
  prisma: PrismaClient,
  fileBuffer: Buffer,
): Promise<ApolImportPreview> {
  const items = await extractPositionedTextFromPdf(fileBuffer);
  const records = groupApolPdfRecords(items);
  const detectedRpiNumber = detectRpiNumberFromItems(items);

  const registeredAliases = await prisma.attorneyNameAlias.findMany({
    where: { active: true },
    select: { aliasNormalized: true },
  });

  const drafts = records
    .map((record) =>
      buildPublicationDraft(record, {
        rpiNumber: detectedRpiNumber ?? "PENDENTE",
        rpiDate: "pending",
        registeredAliasesNormalized: registeredAliases.map((a) => a.aliasNormalized),
      }),
    )
    .filter((draft): draft is NonNullable<typeof draft> => draft !== null);

  let totalConfirmados = 0;
  let totalDuvidosos = 0;
  let totalConfirmadosPe = 0;
  let totalLocalizacaoNaoConfirmada = 0;

  const confirmados: ApolImportPreview["confirmados"] = [];

  for (const draft of drafts) {
    const hasConfirmed = draft.attorneys.some((a) => a.matchStatus === "CONFIRMADO");
    if (hasConfirmed) totalConfirmados += 1;
    else totalDuvidosos += 1;

    if (draft.peStatus === "CONFIRMADO_PE") totalConfirmadosPe += 1;
    if (draft.peStatus === "NAO_CONFIRMADO_REVISAR") totalLocalizacaoNaoConfirmada += 1;

    confirmados.push({
      processNumber: draft.processNumber,
      trademarkName: draft.trademarkName,
      holders: draft.holders.map((h) => h.nameRaw),
      peStatus: draft.peStatus,
      matchStatus: hasConfirmed ? "CONFIRMADO" : "DUVIDOSO_REVISAR",
    });
  }

  return {
    detectedRpiNumber,
    totalRecords: records.length,
    totalConfirmados,
    totalDuvidosos,
    totalConfirmadosPe,
    totalLocalizacaoNaoConfirmada,
    confirmados,
  };
}
