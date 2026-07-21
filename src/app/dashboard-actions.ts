"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

/**
 * Alterna o status de revisão de uma publicação (seção 11: "marcar como
 * revisado"). Uma sugestão automática nunca vira decisão jurídica --
 * marcar como revisado é apenas controle de fluxo de trabalho humano.
 */
export async function toggleReviewStatus(formData: FormData) {
  const user = await requireRole(["ADMINISTRADOR", "ANALISTA"]);

  const publicationId = formData.get("publicationId");
  if (typeof publicationId !== "string" || publicationId === "") {
    throw new Error("publicationId ausente");
  }

  const publication = await prisma.publication.findUniqueOrThrow({
    where: { id: publicationId },
  });

  const newStatus = publication.reviewStatus === "REVISADO" ? "NAO_REVISADO" : "REVISADO";

  await prisma.$transaction([
    prisma.publication.update({
      where: { id: publicationId },
      data: {
        reviewStatus: newStatus,
        reviewedById: newStatus === "REVISADO" ? user.id : null,
        reviewedAt: newStatus === "REVISADO" ? new Date() : null,
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "TOGGLE_REVIEW_STATUS",
        entityType: "Publication",
        entityId: publicationId,
        oldValue: { reviewStatus: publication.reviewStatus },
        newValue: { reviewStatus: newStatus },
      },
    }),
  ]);

  revalidatePath("/");
}
