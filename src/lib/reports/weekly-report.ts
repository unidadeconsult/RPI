import type { PrismaClient, DispatchCategory } from "@/generated/prisma/client";
import { CATEGORY_LABELS } from "@/lib/dashboard/publication-filters";

export type CategoryCount = { category: DispatchCategory; count: number };

export type WeeklyReportData = {
  rpiEditionId: string;
  rpiNumber: string;
  rpiDate: Date;
  totalOcorrencias: number;
  totalConfirmadas: number;
  totalDuvidosas: number;
  categoryCounts: CategoryCount[];
  processosNovos: number;
  mudancasDeSituacao: number;
  prazosUrgentes: number;
  tarefasCriadas: number;
  pendentesRevisao: number;
  codigosDesconhecidos: number;
  processosForaDaCarteira: number;
  marcasSemelhantesEncontradas: number;
  documentosPendentes: number;
};

/**
 * Monta os dados do relatorio semanal (secao 22) para uma edicao da RPI.
 * Cada numero e derivado diretamente do banco -- nada e estimado ou
 * inventado; quando um modulo ainda nao existe (marcas semelhantes),
 * o numero e honestamente 0 em vez de um valor fabricado.
 */
export async function buildWeeklyReportData(
  prisma: PrismaClient,
  rpiEditionId: string,
): Promise<WeeklyReportData> {
  const edition = await prisma.rpiEdition.findUniqueOrThrow({
    where: { id: rpiEditionId },
    include: {
      publications: {
        include: { attorneyLinks: true },
      },
    },
  });

  const publications = edition.publications;
  const proceedingIds = [
    ...new Set(publications.map((p) => p.proceedingId).filter((id): id is string => Boolean(id))),
  ];

  const totalConfirmadas = publications.filter((p) =>
    p.attorneyLinks.some((a) => a.matchStatus === "CONFIRMADO"),
  ).length;
  const totalDuvidosas = publications.filter(
    (p) => !p.attorneyLinks.some((a) => a.matchStatus === "CONFIRMADO"),
  ).length;

  const categoryCountMap = new Map<DispatchCategory, number>();
  for (const pub of publications) {
    categoryCountMap.set(pub.category, (categoryCountMap.get(pub.category) ?? 0) + 1);
  }
  const categoryCounts: CategoryCount[] = [...categoryCountMap.entries()].map(
    ([category, count]) => ({ category, count }),
  );

  const otherPublicationsByProceeding = proceedingIds.length
    ? await prisma.publication.findMany({
        where: {
          proceedingId: { in: proceedingIds },
          rpiEditionId: { not: rpiEditionId },
        },
        select: { proceedingId: true, category: true },
      })
    : [];

  const priorProceedingIds = new Set(
    otherPublicationsByProceeding.map((p) => p.proceedingId).filter(Boolean),
  );
  const processosNovos = proceedingIds.filter((id) => !priorProceedingIds.has(id)).length;

  const priorCategoryByProceeding = new Map<string, Set<DispatchCategory>>();
  for (const p of otherPublicationsByProceeding) {
    if (!p.proceedingId) continue;
    if (!priorCategoryByProceeding.has(p.proceedingId)) {
      priorCategoryByProceeding.set(p.proceedingId, new Set());
    }
    priorCategoryByProceeding.get(p.proceedingId)!.add(p.category);
  }
  const mudancasDeSituacao = publications.filter((p) => {
    if (!p.proceedingId) return false;
    const priorCategories = priorCategoryByProceeding.get(p.proceedingId);
    return priorCategories && !priorCategories.has(p.category) && priorCategories.size > 0;
  }).length;

  const today = new Date();
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);

  const [
    prazosUrgentes,
    tarefasCriadas,
    linkedProceedingIds,
    similarityMatches,
    proceedingsWithDocuments,
  ] = await Promise.all([
    prisma.deadline.count({
      where: {
        status: { not: "CANCELADO" },
        OR: [
          { confirmedDate: { lte: in7Days } },
          { AND: [{ confirmedDate: null }, { suggestedDate: { lte: in7Days } }] },
        ],
      },
    }),
    prisma.task.count({ where: { publicationId: { in: publications.map((p) => p.id) } } }),
    proceedingIds.length
      ? prisma.clientProcess.findMany({
          where: { proceedingId: { in: proceedingIds } },
          distinct: ["proceedingId"],
          select: { proceedingId: true },
        })
      : [],
    prisma.similarityMatch.count({ where: { status: "RELEVANTE" } }),
    proceedingIds.length
      ? prisma.document.findMany({
          where: { proceedingId: { in: proceedingIds } },
          distinct: ["proceedingId"],
          select: { proceedingId: true },
        })
      : [],
  ]);

  const processosForaDaCarteira = proceedingIds.length - linkedProceedingIds.length;
  const documentosPendentes = proceedingIds.length - proceedingsWithDocuments.length;

  return {
    rpiEditionId: edition.id,
    rpiNumber: edition.number,
    rpiDate: edition.publicationDate,
    totalOcorrencias: publications.length,
    totalConfirmadas,
    totalDuvidosas,
    categoryCounts,
    processosNovos,
    mudancasDeSituacao,
    prazosUrgentes,
    tarefasCriadas,
    pendentesRevisao: publications.filter((p) => p.reviewStatus === "NAO_REVISADO").length,
    codigosDesconhecidos: publications.filter((p) => p.categoryIsUnknownCode).length,
    processosForaDaCarteira: Math.max(0, processosForaDaCarteira),
    marcasSemelhantesEncontradas: similarityMatches,
    documentosPendentes: Math.max(0, documentosPendentes),
  };
}

export function buildWhatsAppSummary(report: WeeklyReportData): string {
  const dateStr = report.rpiDate.toLocaleDateString("pt-BR");
  return (
    `Na RPI nº ${report.rpiNumber} (${dateStr}) foram encontradas ${report.totalOcorrencias} ` +
    `publicações em que Jane Glaucia Vieira aparece como procuradora ` +
    `(${report.totalConfirmadas} confirmadas, ${report.totalDuvidosas} para revisar).\n` +
    `Prazos urgentes (7 dias): ${report.prazosUrgentes}. ` +
    `Pendentes de revisão: ${report.pendentesRevisao}. ` +
    `Processos ainda fora da carteira: ${report.processosForaDaCarteira}.`
  );
}

export function buildEmailText(report: WeeklyReportData): string {
  const dateStr = report.rpiDate.toLocaleDateString("pt-BR");
  const categoryLines = report.categoryCounts
    .map((c) => `- ${CATEGORY_LABELS[c.category]}: ${c.count}`)
    .join("\n");

  return (
    `Relatório semanal — RPI nº ${report.rpiNumber} (${dateStr})\n\n` +
    `Total de publicações com Jane Glaucia Vieira como procuradora: ${report.totalOcorrencias}\n` +
    `  Confirmadas: ${report.totalConfirmadas}\n` +
    `  Vínculo não confirmado (revisar): ${report.totalDuvidosas}\n\n` +
    `Por categoria:\n${categoryLines || "(nenhuma)"}\n\n` +
    `Processos novos: ${report.processosNovos}\n` +
    `Mudanças de situação: ${report.mudancasDeSituacao}\n` +
    `Prazos urgentes (próximos 7 dias): ${report.prazosUrgentes}\n` +
    `Tarefas criadas a partir desta edição: ${report.tarefasCriadas}\n` +
    `Pendentes de revisão: ${report.pendentesRevisao}\n` +
    `Códigos de despacho desconhecidos: ${report.codigosDesconhecidos}\n` +
    `Processos fora da carteira de clientes: ${report.processosForaDaCarteira}\n` +
    `Marcas semelhantes relevantes encontradas: ${report.marcasSemelhantesEncontradas}\n` +
    `Processos sem nenhum documento anexado: ${report.documentosPendentes}\n\n` +
    `Esta é uma ferramenta de apoio operacional e não substitui a análise jurídica profissional.`
  );
}
