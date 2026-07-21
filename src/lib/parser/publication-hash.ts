import { createHash } from "node:crypto";
import { normalizeName } from "./normalize-text";

/**
 * Hash de deduplicacao de publicacao (secao 6). Usa os campos disponiveis;
 * campos ausentes entram como string vazia para nao quebrar a composicao.
 */
export type PublicationHashInput = {
  rpiNumber: string;
  rpiDate: string;
  processNumber?: string | null;
  dispatchCode?: string | null;
  description?: string | null;
  trademarkName?: string | null;
  holderName?: string | null;
  attorneyName?: string | null;
};

export function buildPublicationHash(input: PublicationHashInput): string {
  const parts = [
    input.rpiNumber.trim(),
    input.rpiDate.trim(),
    (input.processNumber ?? "").trim(),
    (input.dispatchCode ?? "").trim(),
    normalizeName(input.description ?? ""),
    normalizeName(input.trademarkName ?? ""),
    normalizeName(input.holderName ?? ""),
    normalizeName(input.attorneyName ?? ""),
  ];

  return createHash("sha256").update(parts.join("|")).digest("hex");
}
