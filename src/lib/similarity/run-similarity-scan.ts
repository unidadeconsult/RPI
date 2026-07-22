import type { PrismaClient } from "@/generated/prisma/client";
import { evaluateMonitoredMatch } from "./trademark-similarity";

const TITULAR_LIKE_ROLES = ["TITULAR", "DEPOSITANTE", "REQUERENTE"] as const;

/**
 * Varre publicacoes recem-importadas em busca de semelhanca com marcas
 * monitoradas ativas (secao 20). Nunca decide sozinho que ha colidencia --
 * apenas cria um SimilarityMatch com status NOVO para revisao humana.
 * Idempotente: uma publicacao ja avaliada para uma marca monitorada nao
 * gera um segundo registro (constraint unica monitoredTrademarkId+publicationId).
 */
export async function scanPublicationsForSimilarity(
  prisma: PrismaClient,
  publicationIds: string[],
): Promise<{ evaluated: number; created: number }> {
  if (publicationIds.length === 0) return { evaluated: 0, created: 0 };

  const monitoredTrademarks = await prisma.monitoredTrademark.findMany({ where: { active: true } });
  if (monitoredTrademarks.length === 0) return { evaluated: 0, created: 0 };

  const publications = await prisma.publication.findMany({
    where: { id: { in: publicationIds } },
    include: {
      proceeding: { include: { trademarks: { include: { classes: true } } } },
      parties: { where: { role: { in: [...TITULAR_LIKE_ROLES] } } },
    },
  });

  let created = 0;
  let evaluated = 0;

  for (const publication of publications) {
    const trademarks = publication.proceeding?.trademarks ?? [];
    if (trademarks.length === 0) continue;
    const titularNames = publication.parties.map((p) => p.name);

    for (const monitored of monitoredTrademarks) {
      evaluated += 1;

      let best: ReturnType<typeof evaluateMonitoredMatch> = null;
      let bestTrademarkId: string | null = null;
      for (const trademark of trademarks) {
        const evaluation = evaluateMonitoredMatch({
          monitored: {
            mainExpression: monitored.mainExpression,
            variations: monitored.variations,
            ignoredTerms: monitored.ignoredTerms,
            niceClasses: monitored.niceClasses,
            titular: monitored.titular,
            minSimilarity: monitored.minSimilarity,
          },
          candidate: {
            trademarkName: trademark.name,
            niceClasses: trademark.classes.map((c) => c.niceClass),
            titularNames,
          },
        });
        if (evaluation && (!best || evaluation.score > best.score)) {
          best = evaluation;
          bestTrademarkId = trademark.id;
        }
      }

      if (!best) continue;

      const existing = await prisma.similarityMatch.findUnique({
        where: {
          monitoredTrademarkId_publicationId: {
            monitoredTrademarkId: monitored.id,
            publicationId: publication.id,
          },
        },
      });
      if (existing) continue;

      await prisma.similarityMatch.create({
        data: {
          monitoredTrademarkId: monitored.id,
          publicationId: publication.id,
          matchedTrademarkId: bestTrademarkId,
          matchType: best.matchType,
          score: best.score,
          matchedTerm: best.matchedTerm,
          niceClassMatch: best.niceClassMatch,
          titularDiffers: best.titularDiffers,
          reasonDetails: best.reasonDetails,
          status: "NOVO",
        },
      });
      created += 1;
    }
  }

  return { evaluated, created };
}
