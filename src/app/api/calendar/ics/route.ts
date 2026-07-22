import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { buildIcsCalendar, type IcsEvent } from "@/lib/calendar/ics-export";

/**
 * Exporta os eventos (prazos, tarefas e eventos manuais futuros) em
 * .ICS (secao 17). Preparado para uma futura integracao com Google
 * Calendar/Outlook, mas nenhuma integracao externa e ativada aqui --
 * e apenas um arquivo para o usuario baixar e importar manualmente.
 */
export async function GET(request: Request) {
  await requireUser();

  const { searchParams } = new URL(request.url);
  const processNumber = searchParams.get("processNumber");

  const proceedingFilter = processNumber
    ? await prisma.proceeding.findUnique({ where: { processNumber } })
    : null;

  const [calendarEvents, deadlines, tasks] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: proceedingFilter ? { proceedingId: proceedingFilter.id } : undefined,
    }),
    prisma.deadline.findMany({
      where: {
        status: { not: "CANCELADO" },
        ...(proceedingFilter ? { proceedingId: proceedingFilter.id } : {}),
      },
    }),
    prisma.task.findMany({
      where: {
        internalDueDate: { not: null },
        ...(proceedingFilter ? { proceedingId: proceedingFilter.id } : {}),
      },
    }),
  ]);

  const events: IcsEvent[] = [
    ...calendarEvents.map((e) => ({ id: e.id, title: e.title, date: e.date, notes: e.notes })),
    ...deadlines
      .filter((d) => d.confirmedDate ?? d.suggestedDate)
      .map((d) => ({
        id: `deadline-${d.id}`,
        title: d.eventLabel,
        date: (d.confirmedDate ?? d.suggestedDate)!,
        notes: d.notes,
      })),
    ...tasks.map((t) => ({
      id: `task-${t.id}`,
      title: t.title,
      date: t.internalDueDate!,
    })),
  ];

  const ics = buildIcsCalendar(events);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="rpi-manager.ics"',
    },
  });
}
