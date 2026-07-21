"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { DISPATCH_CATEGORIES } from "@/lib/dashboard/publication-filters";
import type { DispatchCategory } from "@/generated/prisma/client";

/**
 * Corrige categoria, subcategoria, providencia definida, responsavel e
 * observacoes de uma publicacao (secao 12: "permitir corrigir os dados
 * sem sair dessa tela"). Uma sugestao automatica nunca vira decisao
 * juridica definitiva -- por isso providencia definida e um campo
 * separado, preenchido pelo profissional responsavel (secao 8).
 */
export async function updatePublicationFields(formData: FormData) {
  const user = await requireRole(["ADMINISTRADOR", "ANALISTA"]);

  const publicationId = formData.get("publicationId");
  if (typeof publicationId !== "string" || publicationId === "") {
    throw new Error("publicationId ausente");
  }

  const categoryRaw = formData.get("category");
  const category =
    typeof categoryRaw === "string" && DISPATCH_CATEGORIES.includes(categoryRaw as DispatchCategory)
      ? (categoryRaw as DispatchCategory)
      : undefined;

  const subcategory = formData.get("subcategory");
  const definedProvidence = formData.get("definedProvidence");
  const notes = formData.get("notes");
  const responsibleUserId = formData.get("responsibleUserId");

  const publication = await prisma.publication.findUniqueOrThrow({
    where: { id: publicationId },
  });

  const data = {
    category: category ?? publication.category,
    subcategory: typeof subcategory === "string" ? subcategory || null : publication.subcategory,
    definedProvidence:
      typeof definedProvidence === "string"
        ? definedProvidence || null
        : publication.definedProvidence,
    notes: typeof notes === "string" ? notes || null : publication.notes,
    responsibleUserId:
      typeof responsibleUserId === "string"
        ? responsibleUserId || null
        : publication.responsibleUserId,
  };

  await prisma.$transaction([
    prisma.publication.update({ where: { id: publicationId }, data }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE_PUBLICATION_FIELDS",
        entityType: "Publication",
        entityId: publicationId,
        oldValue: {
          category: publication.category,
          subcategory: publication.subcategory,
          definedProvidence: publication.definedProvidence,
          notes: publication.notes,
          responsibleUserId: publication.responsibleUserId,
        },
        newValue: data,
      },
    }),
  ]);

  revalidatePath(`/publications/${publicationId}`);
  revalidatePath("/");
}
