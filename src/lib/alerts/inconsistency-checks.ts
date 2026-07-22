import type { PrismaClient } from "@/generated/prisma/client";
import { computeDeadlineUrgency } from "@/lib/deadlines/deadline-calc";

export type AlertSeverity = "ALTA" | "MEDIA" | "BAIXA";

export type InconsistencyAlert = {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  count: number;
  href?: string;
};

const SEVERITY_ORDER: Record<AlertSeverity, number> = { ALTA: 0, MEDIA: 1, BAIXA: 2 };

export function rankBySeverity(alerts: InconsistencyAlert[]): InconsistencyAlert[] {
  return [...alerts].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

/**
 * Detecta inconsistencias operacionais (secao 24) a partir de regras
 * objetivas sobre os dados ja existentes -- nunca infere ou inventa uma
 * inconsistencia juridica, apenas sinaliza lacunas de cadastro/processo
 * para revisao humana.
 */
export async function buildInconsistencyAlerts(prisma: PrismaClient): Promise<InconsistencyAlert[]> {
  const today = new Date();

  const [
    publicationsWithoutProceeding,
    publicationsWithoutTrademark,
    unknownCodeGroups,
    publicationsMissingExpectedDeadline,
    overdueUnconfirmedDeadlines,
    clientsWithoutResponsible,
  ] = await Promise.all([
    prisma.publication.count({ where: { proceedingId: null } }),
    prisma.publication.count({ where: { proceeding: { trademarks: { none: {} } } } }),
    prisma.publication.groupBy({
      by: ["dispatchCodeId"],
      where: { categoryIsUnknownCode: true, dispatchCodeId: { not: null } },
      _count: { _all: true },
    }),
    prisma.publication.count({
      where: { dispatchCode: { rule: { hasDeadline: true } }, deadlines: { none: {} } },
    }),
    prisma.deadline.findMany({
      where: { status: "SUGERIDO_CONFERIR" },
      select: { suggestedDate: true, confirmedDate: true },
    }),
    prisma.client.count({ where: { internalResponsibleId: null } }),
  ]);

  const recurringUnknownCodes = unknownCodeGroups.filter((g) => g._count._all >= 3);
  const overdueCount = overdueUnconfirmedDeadlines.filter((d) => {
    const urgency = computeDeadlineUrgency(d.confirmedDate ?? d.suggestedDate, today);
    return urgency === "VENCIDO" || urgency === "HOJE";
  }).length;

  const alerts: InconsistencyAlert[] = [
    {
      id: "publications-without-proceeding",
      severity: "ALTA",
      title: "Publicações sem processo vinculado",
      description:
        "Publicações importadas sem nenhum processo (proceeding) associado -- indica falha na etapa de importação.",
      count: publicationsWithoutProceeding,
    },
    {
      id: "publications-without-trademark",
      severity: "MEDIA",
      title: "Publicações sem marca associada ao processo",
      description:
        "O processo existe, mas nenhuma marca foi extraída para ele -- revise manualmente o trecho original.",
      count: publicationsWithoutTrademark,
    },
    {
      id: "recurring-unknown-dispatch-codes",
      severity: "ALTA",
      title: "Códigos de despacho não classificados recorrentes",
      description: `${recurringUnknownCodes.length} código(s) de despacho aparecem 3 ou mais vezes sem uma regra cadastrada -- considere mapeá-los na tabela de regras administrável.`,
      count: recurringUnknownCodes.reduce((sum, g) => sum + g._count._all, 0),
      href: "/?category=OUTROS_NAO_CLASSIFICADO",
    },
    {
      id: "publications-missing-expected-deadline",
      severity: "MEDIA",
      title: "Publicações que deveriam ter prazo, mas nenhum foi cadastrado",
      description:
        "A regra do código de despacho indica que este tipo de publicação normalmente gera prazo, mas nenhum prazo foi criado ainda para ela.",
      count: publicationsMissingExpectedDeadline,
    },
    {
      id: "overdue-unconfirmed-deadlines",
      severity: "ALTA",
      title: "Prazos sugeridos vencidos sem confirmação",
      description:
        "A data sugerida pelo sistema já passou e ninguém confirmou (ou cancelou) o prazo -- risco de perda de prazo real.",
      count: overdueCount,
      href: "/deadlines",
    },
    {
      id: "clients-without-responsible",
      severity: "BAIXA",
      title: "Clientes sem responsável interno definido",
      description: "Nenhum usuário interno foi designado como responsável por este cliente.",
      count: clientsWithoutResponsible,
      href: "/clients",
    },
  ];

  return rankBySeverity(alerts.filter((a) => a.count > 0));
}
