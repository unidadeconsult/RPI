"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

/**
 * Registra a decisao humana sobre uma semelhanca sinalizada pelo sistema
 * (secao 20). O sistema nunca marca uma semelhanca como relevante sozinho.
 */
export async function reviewSimilarityMatch(formData: FormData) {
  const user = await requireRole(["ADMINISTRADOR", "ANALISTA"]);

  const matchId = formData.get("matchId");
  const status = formData.get("status");
  const notes = formData.get("notes");

  if (typeof matchId !== "string" || matchId === "") {
    throw new Error("matchId ausente");
  }
  if (status !== "RELEVANTE" && status !== "FALSO_POSITIVO") {
    throw new Error("status inválido");
  }

  await prisma.similarityMatch.update({
    where: { id: matchId },
    data: {
      status,
      reviewedById: user.id,
      reviewedAt: new Date(),
      notes: typeof notes === "string" ? notes || null : undefined,
    },
  });

  revalidatePath("/similarity-matches");
}
