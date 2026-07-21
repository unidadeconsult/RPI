/**
 * Calculo de prazo (secao 16). O prazo sugerido nunca e uma conclusao
 * juridica definitiva -- so vira operante apos confirmacao humana
 * (Deadline.status muda de SUGERIDO_CONFERIR para CONFIRMADO).
 */
export type CountingType = "CORRIDOS" | "UTEIS";

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Soma dias corridos ou uteis (util = nao cai em sabado/domingo; sem
 * calendario de feriados, que nao esta disponivel nos dados do sistema).
 */
export function computeSuggestedDate(
  publicationDate: Date,
  daysConfigured: number,
  countingType: CountingType,
): Date {
  const result = new Date(publicationDate);

  if (countingType === "CORRIDOS") {
    result.setUTCDate(result.getUTCDate() + daysConfigured);
    return result;
  }

  let remaining = daysConfigured;
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    if (!isWeekend(result)) remaining -= 1;
  }
  return result;
}

export type DeadlineUrgency =
  | "SEM_DATA"
  | "VENCIDO"
  | "HOJE"
  | "URGENTE_3"
  | "URGENTE_7"
  | "ATENCAO_15"
  | "ATENCAO_30"
  | "NORMAL";

export const DEADLINE_URGENCY_LABELS: Record<DeadlineUrgency, string> = {
  SEM_DATA: "Sem data",
  VENCIDO: "Prazo vencido",
  HOJE: "Vence hoje",
  URGENTE_3: "Vence em até 3 dias",
  URGENTE_7: "Vence em até 7 dias",
  ATENCAO_15: "Vence em até 15 dias",
  ATENCAO_30: "Vence em até 30 dias",
  NORMAL: "Dentro do prazo",
};

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function computeDeadlineUrgency(
  operativeDate: Date | null,
  today: Date = new Date(),
): DeadlineUrgency {
  if (!operativeDate) return "SEM_DATA";

  const diffDays = Math.round(
    (startOfUtcDay(operativeDate).getTime() - startOfUtcDay(today).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) return "VENCIDO";
  if (diffDays === 0) return "HOJE";
  if (diffDays <= 3) return "URGENTE_3";
  if (diffDays <= 7) return "URGENTE_7";
  if (diffDays <= 15) return "ATENCAO_15";
  if (diffDays <= 30) return "ATENCAO_30";
  return "NORMAL";
}
