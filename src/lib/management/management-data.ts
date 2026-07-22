import type { PrismaClient, DispatchCategory } from "@/generated/prisma/client";
import { CATEGORY_LABELS } from "@/lib/dashboard/publication-filters";
import { computeDeadlineUrgency } from "@/lib/deadlines/deadline-calc";

export type EditionCount = { rpiEditionId: string; number: string; publicationDate: Date; count: number };
export type CategoryCount = { category: DispatchCategory; label: string; count: number };
export type ResponsibleTaskCount = { userId: string; name: string; total: number; overdue: number };
export type ClientProcessCount = { clientId: string; name: string; total: number };
export type ProceedingRef = { id: string; processNumber: string };

export type ManagementData = {
  publicationsByEdition: EditionCount[];
  categoryCounts: CategoryCount[];
  deadlinesOpen: number;
  deadlinesOverdue: number;
  avgReviewTimeHours: number | null;
  tasksByResponsible: ResponsibleTaskCount[];
  tasksOverdue: number;
  proceedingsWithoutClient: { total: number; sample: ProceedingRef[] };
  unknownDispatchCodes: number;
  correctionsCount: number;
  documentsPendingProceedings: { total: number; sample: ProceedingRef[] };
  messagesPreparedCount: number;
  similarityRelevantCount: number;
  clientProcessVolume: ClientProcessCount[];
};

/**
 * Media em horas entre a criacao (importacao) e a revisao de uma publicacao.
 * Retorna null quando nao ha nenhuma publicacao revisada -- nao inventa numero.
 */
export function computeAverageReviewHours(pairs: { createdAt: Date; reviewedAt: Date }[]): number | null {
  if (pairs.length === 0) return null;
  const totalMs = pairs.reduce((sum, p) => sum + (p.reviewedAt.getTime() - p.createdAt.getTime()), 0);
  return totalMs / pairs.length / (1000 * 60 * 60);
}

export async function buildManagementData(prisma: PrismaClient): Promise<ManagementData> {
  const today = new Date();

  const [
    editions,
    categoryGroups,
    deadlines,
    reviewedPublications,
    tasks,
    users,
    proceedingsWithPublication,
    proceedingsWithClient,
    unknownDispatchCodes,
    correctionsCount,
    proceedingsWithDocument,
    messagesPreparedCount,
    similarityRelevantCount,
    clientProcessGroups,
    clients,
  ] = await Promise.all([
    prisma.rpiEdition.findMany({
      orderBy: { publicationDate: "desc" },
      take: 8,
      include: { _count: { select: { publications: true } } },
    }),
    prisma.publication.groupBy({ by: ["category"], _count: { _all: true } }),
    prisma.deadline.findMany({ where: { status: { not: "CANCELADO" } }, select: { confirmedDate: true, suggestedDate: true, status: true } }),
    prisma.publication.findMany({
      where: { reviewedAt: { not: null } },
      select: { createdAt: true, reviewedAt: true },
    }),
    prisma.task.findMany({
      where: { responsibleUserId: { not: null } },
      select: { responsibleUserId: true, internalDueDate: true, status: true },
    }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true } }),
    prisma.publication.findMany({
      where: { proceedingId: { not: null } },
      distinct: ["proceedingId"],
      select: { proceeding: { select: { id: true, processNumber: true } } },
    }),
    prisma.clientProcess.findMany({ distinct: ["proceedingId"], select: { proceedingId: true } }),
    prisma.publication.count({ where: { categoryIsUnknownCode: true } }),
    prisma.auditLog.count({ where: { action: "UPDATE_PUBLICATION_FIELDS" } }),
    prisma.document.findMany({
      where: { proceedingId: { not: null } },
      distinct: ["proceedingId"],
      select: { proceedingId: true },
    }),
    prisma.messageDraft.count(),
    prisma.similarityMatch.count({ where: { status: "RELEVANTE" } }),
    prisma.clientProcess.groupBy({ by: ["clientId"], _count: { _all: true } }),
    prisma.client.findMany({ select: { id: true, name: true } }),
  ]);

  const publicationsByEdition: EditionCount[] = editions
    .map((e) => ({
      rpiEditionId: e.id,
      number: e.number,
      publicationDate: e.publicationDate,
      count: e._count.publications,
    }))
    .sort((a, b) => a.publicationDate.getTime() - b.publicationDate.getTime());

  const categoryCounts: CategoryCount[] = categoryGroups.map((g) => ({
    category: g.category,
    label: CATEGORY_LABELS[g.category],
    count: g._count._all,
  }));

  const deadlinesOpen = deadlines.length;
  const deadlinesOverdue = deadlines.filter((d) => {
    const operativeDate = d.confirmedDate ?? d.suggestedDate;
    const urgency = computeDeadlineUrgency(operativeDate, today);
    return urgency === "VENCIDO" || urgency === "HOJE";
  }).length;

  const avgReviewTimeHours = computeAverageReviewHours(
    reviewedPublications.filter((p): p is { createdAt: Date; reviewedAt: Date } => p.reviewedAt !== null),
  );

  const userNameById = new Map(users.map((u) => [u.id, u.name]));
  const tasksByResponsibleMap = new Map<string, { total: number; overdue: number }>();
  for (const task of tasks) {
    const userId = task.responsibleUserId;
    if (!userId) continue;
    const entry = tasksByResponsibleMap.get(userId) ?? { total: 0, overdue: 0 };
    entry.total += 1;
    const isOverdue =
      task.internalDueDate !== null &&
      task.internalDueDate < today &&
      !["CONCLUIDO", "CANCELADO", "SEM_PROVIDENCIA"].includes(task.status);
    if (isOverdue) entry.overdue += 1;
    tasksByResponsibleMap.set(userId, entry);
  }
  const tasksByResponsible: ResponsibleTaskCount[] = [...tasksByResponsibleMap.entries()]
    .map(([userId, counts]) => ({
      userId,
      name: userNameById.get(userId) ?? "Usuário removido",
      total: counts.total,
      overdue: counts.overdue,
    }))
    .sort((a, b) => b.total - a.total);
  const tasksOverdue = tasksByResponsible.reduce((sum, r) => sum + r.overdue, 0);

  const proceedingIdsWithClient = new Set(
    proceedingsWithClient.map((p) => p.proceedingId).filter((id): id is string => Boolean(id)),
  );
  const proceedingsWithoutClientRefs: ProceedingRef[] = proceedingsWithPublication
    .map((p) => p.proceeding)
    .filter((p): p is ProceedingRef => Boolean(p) && !proceedingIdsWithClient.has(p!.id));

  const proceedingIdsWithDocument = new Set(
    proceedingsWithDocument.map((d) => d.proceedingId).filter((id): id is string => Boolean(id)),
  );
  const proceedingsWithoutDocumentRefs: ProceedingRef[] = proceedingsWithPublication
    .map((p) => p.proceeding)
    .filter((p): p is ProceedingRef => Boolean(p) && !proceedingIdsWithDocument.has(p!.id));

  const clientNameById = new Map(clients.map((c) => [c.id, c.name]));
  const clientProcessVolume: ClientProcessCount[] = clientProcessGroups
    .map((g) => ({ clientId: g.clientId, name: clientNameById.get(g.clientId) ?? "Cliente removido", total: g._count._all }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return {
    publicationsByEdition,
    categoryCounts,
    deadlinesOpen,
    deadlinesOverdue,
    avgReviewTimeHours,
    tasksByResponsible,
    tasksOverdue,
    proceedingsWithoutClient: {
      total: proceedingsWithoutClientRefs.length,
      sample: proceedingsWithoutClientRefs.slice(0, 10),
    },
    unknownDispatchCodes,
    correctionsCount,
    documentsPendingProceedings: {
      total: proceedingsWithoutDocumentRefs.length,
      sample: proceedingsWithoutDocumentRefs.slice(0, 10),
    },
    messagesPreparedCount,
    similarityRelevantCount,
    clientProcessVolume,
  };
}
