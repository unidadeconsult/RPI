"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import type { CalendarEventType, TaskPriority } from "@/generated/prisma/client";
import { EVENT_TYPES } from "@/lib/calendar/event-labels";

function textOrNull(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/**
 * Cria um evento manual de calendario (secao 17). Nenhuma integracao
 * externa (Google Calendar/Outlook) e ativada aqui -- apenas os dados
 * internos do sistema, conforme exigido no escopo.
 */
export async function createCalendarEvent(formData: FormData) {
  const user = await requireRole(["ADMINISTRADOR", "ANALISTA"]);

  const title = formData.get("title");
  const dateRaw = formData.get("date");
  const typeRaw = formData.get("type");

  if (typeof title !== "string" || title.trim() === "" || typeof dateRaw !== "string" || !dateRaw) {
    throw new Error("Título e data são obrigatórios.");
  }

  const type: CalendarEventType = EVENT_TYPES.includes(typeRaw as CalendarEventType)
    ? (typeRaw as CalendarEventType)
    : "INTERNO";

  const processNumber = textOrNull(formData.get("processNumber"));
  let proceedingId: string | null = null;
  if (processNumber) {
    const proceeding = await prisma.proceeding.findUnique({ where: { processNumber } });
    proceedingId = proceeding?.id ?? null;
  }

  const priorityRaw = formData.get("priority");
  const priority: TaskPriority | null = ["BAIXA", "MEDIA", "ALTA", "URGENTE"].includes(
    priorityRaw as string,
  )
    ? (priorityRaw as TaskPriority)
    : null;

  const event = await prisma.calendarEvent.create({
    data: {
      title: title.trim(),
      type,
      date: new Date(dateRaw),
      proceedingId,
      clientId: textOrNull(formData.get("clientId")),
      responsibleUserId: textOrNull(formData.get("responsibleUserId")),
      priority,
      notes: textOrNull(formData.get("notes")),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "CREATE_CALENDAR_EVENT",
      entityType: "CalendarEvent",
      entityId: event.id,
      newValue: { title: event.title, date: event.date.toISOString() },
    },
  });

  revalidatePath("/calendar");
}

export async function rescheduleCalendarEvent(formData: FormData) {
  const user = await requireRole(["ADMINISTRADOR", "ANALISTA"]);

  const eventId = formData.get("eventId");
  const dateRaw = formData.get("date");
  if (typeof eventId !== "string" || typeof dateRaw !== "string" || !dateRaw) {
    throw new Error("Dados inválidos.");
  }

  const event = await prisma.calendarEvent.findUniqueOrThrow({ where: { id: eventId } });

  await prisma.$transaction([
    prisma.calendarEvent.update({ where: { id: eventId }, data: { date: new Date(dateRaw) } }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "RESCHEDULE_CALENDAR_EVENT",
        entityType: "CalendarEvent",
        entityId: eventId,
        oldValue: { date: event.date.toISOString() },
        newValue: { date: dateRaw },
      },
    }),
  ]);

  revalidatePath("/calendar");
}

export async function toggleCalendarEventConfirmed(formData: FormData) {
  const user = await requireRole(["ADMINISTRADOR", "ANALISTA"]);

  const eventId = formData.get("eventId");
  if (typeof eventId !== "string") throw new Error("eventId ausente");

  const event = await prisma.calendarEvent.findUniqueOrThrow({ where: { id: eventId } });

  await prisma.$transaction([
    prisma.calendarEvent.update({
      where: { id: eventId },
      data: { confirmed: !event.confirmed },
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "TOGGLE_CALENDAR_EVENT_CONFIRMED",
        entityType: "CalendarEvent",
        entityId: eventId,
        oldValue: { confirmed: event.confirmed },
        newValue: { confirmed: !event.confirmed },
      },
    }),
  ]);

  revalidatePath("/calendar");
}
