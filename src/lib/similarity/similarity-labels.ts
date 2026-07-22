import type { SimilarityMatchType, SimilarityStatus } from "@/generated/prisma/client";

export const SIMILARITY_MATCH_TYPE_LABELS: Record<SimilarityMatchType, string> = {
  IDENTICA: "Idêntica",
  ALTA: "Alta",
  MEDIA: "Média",
  BAIXA: "Baixa",
  REVISAR: "A revisar",
};

export const SIMILARITY_STATUS_LABELS: Record<SimilarityStatus, string> = {
  NOVO: "Novo",
  RELEVANTE: "Relevante",
  FALSO_POSITIVO: "Falso positivo",
};

export const SIMILARITY_STATUSES: SimilarityStatus[] = ["NOVO", "RELEVANTE", "FALSO_POSITIVO"];
