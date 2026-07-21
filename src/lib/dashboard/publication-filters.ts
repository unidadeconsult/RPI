import type { Prisma, DispatchCategory, ConfidenceLevel, ReviewStatus } from "@/generated/prisma/client";

export const DISPATCH_CATEGORIES: DispatchCategory[] = [
  "DEFERIMENTO",
  "PUBLICACAO",
  "OPOSICAO",
  "NULIDADE",
  "CADUCIDADE",
  "INDEFERIMENTO",
  "ARQUIVAMENTO",
  "OUTROS_NAO_CLASSIFICADO",
];

export const CATEGORY_LABELS: Record<DispatchCategory, string> = {
  DEFERIMENTO: "Deferimentos",
  PUBLICACAO: "Publicações",
  OPOSICAO: "Oposições",
  NULIDADE: "Nulidades",
  CADUCIDADE: "Caducidades",
  INDEFERIMENTO: "Indeferimentos",
  ARQUIVAMENTO: "Arquivamentos",
  OUTROS_NAO_CLASSIFICADO: "Outros / Não classificados",
};

export type PublicationFilters = {
  rpiNumber: string;
  category: DispatchCategory | "";
  dispatchCode: string;
  processNumber: string;
  trademark: string;
  holder: string;
  uf: string;
  peOnly: boolean;
  confidence: ConfidenceLevel | "";
  reviewStatus: ReviewStatus | "";
  page: number;
};

const PAGE_SIZE = 25;
export { PAGE_SIZE };

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function parsePublicationFilters(
  searchParams: Record<string, string | string[] | undefined>,
): PublicationFilters {
  const category = firstValue(searchParams.category);
  const confidence = firstValue(searchParams.confidence);
  const reviewStatus = firstValue(searchParams.reviewStatus);
  const page = Number.parseInt(firstValue(searchParams.page), 10);

  return {
    rpiNumber: firstValue(searchParams.rpiNumber),
    category: DISPATCH_CATEGORIES.includes(category as DispatchCategory)
      ? (category as DispatchCategory)
      : "",
    dispatchCode: firstValue(searchParams.dispatchCode),
    processNumber: firstValue(searchParams.processNumber),
    trademark: firstValue(searchParams.trademark),
    holder: firstValue(searchParams.holder),
    uf: firstValue(searchParams.uf).toUpperCase(),
    peOnly: firstValue(searchParams.peOnly) === "on",
    confidence: ["ALTA", "MEDIA", "BAIXA"].includes(confidence)
      ? (confidence as ConfidenceLevel)
      : "",
    reviewStatus: ["NAO_REVISADO", "REVISADO"].includes(reviewStatus)
      ? (reviewStatus as ReviewStatus)
      : "",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function buildPublicationWhere(filters: PublicationFilters): Prisma.PublicationWhereInput {
  const where: Prisma.PublicationWhereInput = {};

  if (filters.rpiNumber) {
    where.rpiEdition = { number: { contains: filters.rpiNumber } };
  }
  if (filters.category) {
    where.category = filters.category;
  }
  if (filters.dispatchCode) {
    where.dispatchCode = { code: { contains: filters.dispatchCode, mode: "insensitive" } };
  }
  if (filters.processNumber) {
    where.processNumberRaw = { contains: filters.processNumber };
  }
  if (filters.trademark) {
    where.proceeding = {
      trademarks: { some: { name: { contains: filters.trademark, mode: "insensitive" } } },
    };
  }
  if (filters.holder) {
    where.parties = { some: { name: { contains: filters.holder, mode: "insensitive" } } };
  }
  if (filters.uf) {
    where.locationUf = filters.uf;
  }
  if (filters.peOnly) {
    where.peStatus = "CONFIRMADO_PE";
  }
  if (filters.confidence) {
    where.confidenceLevel = filters.confidence;
  }
  if (filters.reviewStatus) {
    where.reviewStatus = filters.reviewStatus;
  }

  return where;
}
