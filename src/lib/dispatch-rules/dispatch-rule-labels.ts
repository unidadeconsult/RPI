import type { UrgencyLevel } from "@/generated/prisma/client";

export const URGENCY_LEVELS: UrgencyLevel[] = ["BAIXA", "MEDIA", "ALTA", "URGENTE"];

export const URGENCY_LEVEL_LABELS: Record<UrgencyLevel, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  URGENTE: "Urgente",
};
