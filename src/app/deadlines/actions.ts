"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { computeSuggestedDate, type CountingType } from "@/lib/deadlines/deadline-calc";

function textOrNull(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/**
 * Cria um prazo sugerido (secao 16). Nunca e apresentado como conclusao
 * juridica definitiva -- fica com status SUGERIDO_CONFERIR ate um
 * responsavel confirmar.
 */
export async function createDeadline(formData: FormData) {
  const user = await requireRole(["ADMINISTRADOR", "ANALISTA"]);

  const publicationId = formData.get("publicationId");
  const eventLabel = formData.get("eventLabel");
  const daysConfiguredRaw = formData.get("daysConfigured");
  const countingTypeRaw = formData.get("countingType");

  if (
    typeof publicationId !== "string" ||
    typeof eventLabel !== "string" ||
    eventLabel.trim() === "" ||
    typeof daysConfiguredRaw !== "string"
  ) {
    throw new Error("Dados do prazo incompletos.");
  }

  const daysConfigured = Number.parseInt(daysConfiguredRaw, 10);
  const countingType: CountingType = countingTypeRaw === "UTEIS" ? "UTEIS" : "CORRIDOS";

  const publication = await prisma.publication.findUniqueOrThrow({
    where: { id: publicationId },
    include: { rpiEdition: true },
  });

  if (!publication.proceedingId) {
    throw new Error("Publicação sem processo associado.");
  }

  const suggestedDate = computeSuggestedDate(
    publication.rpiEdition.publicationDate,
    daysConfigured,
    countingType,
  );

  const deadline = await prisma.deadline.create({
    data: {
      publicationId,
      proceedingId: publication.proceedingId,
      eventLabel: eventLabel.trim(),
      publicationDate: publication.rpiEdition.publicationDate,
      daysConfigured,
      countingType,
      suggestedDate,
      status: "SUGERIDO_CONFERIR",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "CREATE_DEADLINE",
      entityType: "Deadline",
      entityId: deadline.id,
      newValue: { eventLabel: deadline.eventLabel, suggestedDate: suggestedDate.toISOString() },
    },
  });

  revalidatePath(`/publications/${publicationId}`);
  revalidatePath("/deadlines");
  revalidatePath("/");
}

export async function confirmDeadline(formData: FormData) {
  const user = await requireRole(["ADMINISTRADOR", "ANALISTA"]);

  const deadlineId = formData.get("deadlineId");
  const confirmedDateRaw = formData.get("confirmedDate");
  const internalDateRaw = textOrNull(formData.get("internalDate"));
  const notes = textOrNull(formData.get("notes"));

  if (typeof deadlineId !== "string" || typeof confirmedDateRaw !== "string" || !confirmedDateRaw) {
    throw new Error("Informe a data confirmada do prazo.");
  }

  const deadline = await prisma.deadline.findUniqueOrThrow({ where: { id: deadlineId } });

  await prisma.$transaction([
    prisma.deadline.update({
      where: { id: deadlineId },
      data: {
        status: "CONFIRMADO",
        confirmedDate: new Date(confirmedDateRaw),
        confirmedById: user.id,
        confirmedAt: new Date(),
        internalDate: internalDateRaw ? new Date(internalDateRaw) : null,
        notes,
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CONFIRM_DEADLINE",
        entityType: "Deadline",
        entityId: deadlineId,
        oldValue: { status: deadline.status },
        newValue: { status: "CONFIRMADO", confirmedDate: confirmedDateRaw },
      },
    }),
  ]);

  revalidatePath("/deadlines");
  revalidatePath("/");
  if (deadline.publicationId) revalidatePath(`/publications/${deadline.publicationId}`);
}

export async function cancelDeadline(formData: FormData) {
  const user = await requireRole(["ADMINISTRADOR", "ANALISTA"]);

  const deadlineId = formData.get("deadlineId");
  if (typeof deadlineId !== "string") throw new Error("deadlineId ausente");

  const deadline = await prisma.deadline.findUniqueOrThrow({ where: { id: deadlineId } });

  await prisma.$transaction([
    prisma.deadline.update({ where: { id: deadlineId }, data: { status: "CANCELADO" } }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CANCEL_DEADLINE",
        entityType: "Deadline",
        entityId: deadlineId,
        oldValue: { status: deadline.status },
        newValue: { status: "CANCELADO" },
      },
    }),
  ]);

  revalidatePath("/deadlines");
  revalidatePath("/");
}
