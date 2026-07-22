import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  computeMonthGridDays,
  computeWeekDays,
  isSameUtcDay,
  isSameUtcMonth,
} from "@/lib/calendar/calendar-grid";
import { EVENT_TYPE_LABELS, EVENT_TYPES } from "@/lib/calendar/event-labels";
import { createCalendarEvent } from "./actions";
import { EventChip } from "./event-chip";

type SearchParams = {
  year?: string;
  month?: string;
  view?: string;
  date?: string;
  type?: string;
  responsibleUserId?: string;
  clientId?: string;
  processNumber?: string;
  priority?: string;
  confirmed?: string;
};

export type UnifiedEvent = {
  id: string;
  kind: "MANUAL" | "DEADLINE" | "TASK";
  title: string;
  date: Date;
  type: string;
  confirmed: boolean;
  href: string | null;
  processNumber?: string | null;
  clientName?: string | null;
  responsibleName?: string | null;
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const canEdit = session.user.role !== "CONSULTA";

  const sp = await searchParams;
  const now = new Date();
  const year = Number.parseInt(sp.year ?? "", 10) || now.getUTCFullYear();
  const month = sp.month !== undefined ? Number.parseInt(sp.month, 10) : now.getUTCMonth();
  const view = sp.view === "week" || sp.view === "day" ? sp.view : "month";
  const referenceDate = sp.date ? new Date(sp.date) : now;

  const gridDays =
    view === "month"
      ? computeMonthGridDays(year, month)
      : view === "week"
        ? computeWeekDays(referenceDate)
        : [referenceDate];

  const rangeStart = gridDays[0];
  const rangeEnd = new Date(gridDays[gridDays.length - 1]);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1);

  const [users, clients, calendarEvents, deadlines, tasks] = await Promise.all([
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.calendarEvent.findMany({
      where: { date: { gte: rangeStart, lt: rangeEnd } },
      include: { proceeding: true, client: true, responsibleUser: true },
    }),
    prisma.deadline.findMany({
      where: { status: { not: "CANCELADO" } },
      include: { proceeding: true },
    }),
    prisma.task.findMany({
      where: { internalDueDate: { gte: rangeStart, lt: rangeEnd } },
      include: { proceeding: true, client: true, responsibleUser: true },
    }),
  ]);

  let events: UnifiedEvent[] = [
    ...calendarEvents.map((e) => ({
      id: e.id,
      kind: "MANUAL" as const,
      title: e.title,
      date: e.date,
      type: e.type,
      confirmed: e.confirmed,
      href: e.proceedingId ? `/proceedings/${e.proceedingId}` : null,
      processNumber: e.proceeding?.processNumber,
      clientName: e.client?.name,
      responsibleName: e.responsibleUser?.name,
    })),
    ...deadlines
      .map((d) => ({ deadline: d, date: d.confirmedDate ?? d.suggestedDate }))
      .filter((d): d is { deadline: (typeof deadlines)[number]; date: Date } =>
        Boolean(d.date && d.date >= rangeStart && d.date < rangeEnd),
      )
      .map(({ deadline, date }) => ({
        id: `deadline-${deadline.id}`,
        kind: "DEADLINE" as const,
        title: deadline.eventLabel,
        date,
        type: "PRAZO",
        confirmed: deadline.status === "CONFIRMADO",
        href: `/proceedings/${deadline.proceedingId}`,
        processNumber: deadline.proceeding.processNumber,
        clientName: null,
        responsibleName: null,
      })),
    ...tasks
      .filter((t) => t.internalDueDate)
      .map((t) => ({
        id: `task-${t.id}`,
        kind: "TASK" as const,
        title: t.title,
        date: t.internalDueDate as Date,
        type: "TAREFA",
        confirmed: t.status === "CONCLUIDO",
        href: `/tasks/${t.id}`,
        processNumber: t.proceeding?.processNumber,
        clientName: t.client?.name,
        responsibleName: t.responsibleUser?.name,
      })),
  ];

  if (sp.type) events = events.filter((e) => e.type === sp.type);
  if (sp.processNumber) {
    events = events.filter((e) => e.processNumber?.includes(sp.processNumber!));
  }
  if (sp.confirmed === "true") events = events.filter((e) => e.confirmed);
  if (sp.confirmed === "false") events = events.filter((e) => !e.confirmed);
  if (sp.responsibleUserId) {
    const name = users.find((u) => u.id === sp.responsibleUserId)?.name;
    events = events.filter((e) => e.responsibleName === name);
  }
  if (sp.clientId) {
    const name = clients.find((c) => c.id === sp.clientId)?.name;
    events = events.filter((e) => e.clientName === name);
  }

  const eventsByDay = new Map<string, UnifiedEvent[]>();
  for (const event of events) {
    const key = event.date.toISOString().slice(0, 10);
    if (!eventsByDay.has(key)) eventsByDay.set(key, []);
    eventsByDay.get(key)!.push(event);
  }

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
            ← Voltar ao dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Calendário</h1>
        </div>
        <a
          href={`/api/calendar/ics${sp.processNumber ? `?processNumber=${sp.processNumber}` : ""}`}
          className="btn-secondary"
        >
          Exportar .ICS
        </a>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={`/calendar?view=month&year=${prevYear}&month=${prevMonth}`}
            className="field text-xs"
          >
            ← Mês anterior
          </Link>
          <span className="font-medium">
            {monthNames[month]} {year}
          </span>
          <Link
            href={`/calendar?view=month&year=${nextYear}&month=${nextMonth}`}
            className="field text-xs"
          >
            Mês seguinte →
          </Link>
        </div>
        <div className="flex gap-2 text-sm">
          {(["month", "week", "day"] as const).map((v) => (
            <Link
              key={v}
              href={`/calendar?view=${v}&year=${year}&month=${month}`}
              className={`rounded-md px-3 py-1 ${
                view === v
                  ? "pill-active"
                  : "pill"
              }`}
            >
              {v === "month" ? "Mensal" : v === "week" ? "Semanal" : "Diário"}
            </Link>
          ))}
        </div>
      </div>

      <form className="flex flex-wrap items-end gap-3 surface-card p-4 text-sm">
        <input type="hidden" name="view" value={view} />
        <input type="hidden" name="year" value={year} />
        <input type="hidden" name="month" value={month} />
        <label className="flex flex-col gap-1">
          Tipo
          <select name="type" defaultValue={sp.type ?? ""} className="field text-xs">
            <option value="">Todos</option>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {EVENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Responsável
          <select name="responsibleUserId" defaultValue={sp.responsibleUserId ?? ""} className="field text-xs">
            <option value="">Todos</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Cliente
          <select name="clientId" defaultValue={sp.clientId ?? ""} className="field text-xs">
            <option value="">Todos</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Processo
          <input type="text" name="processNumber" defaultValue={sp.processNumber ?? ""} className="field text-xs" />
        </label>
        <label className="flex flex-col gap-1">
          Confirmado
          <select name="confirmed" defaultValue={sp.confirmed ?? ""} className="field text-xs">
            <option value="">Todos</option>
            <option value="true">Confirmado</option>
            <option value="false">Não confirmado</option>
          </select>
        </label>
        <button type="submit" className="btn-primary">
          Filtrar
        </button>
      </form>

      {view === "month" && (
        <section className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 text-sm dark:border-slate-800 dark:bg-slate-800">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
            <div key={d} className="bg-slate-50 p-2 text-center text-xs font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              {d}
            </div>
          ))}
          {gridDays.map((day) => {
            const key = day.toISOString().slice(0, 10);
            const dayEvents = eventsByDay.get(key) ?? [];
            const inMonth = isSameUtcMonth(day, month, year);
            const isToday = isSameUtcDay(day, now);
            return (
              <div
                key={key}
                className={`min-h-[100px] bg-white p-1.5 dark:bg-slate-900 ${
                  inMonth ? "" : "opacity-40"
                }`}
              >
                <p className={`text-xs ${isToday ? "font-bold text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"}`}>
                  {day.getUTCDate()}
                </p>
                <div className="mt-1 flex flex-col gap-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <EventChip key={event.id} event={event} />
                  ))}
                  {dayEvents.length > 3 && (
                    <p className="text-xs text-slate-400">+{dayEvents.length - 3} mais</p>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {view !== "month" && (
        <section className="flex flex-col gap-3">
          {gridDays.map((day) => {
            const key = day.toISOString().slice(0, 10);
            const dayEvents = eventsByDay.get(key) ?? [];
            return (
              <div key={key} className="surface-card p-4">
                <p className="text-sm font-medium">
                  {day.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", timeZone: "UTC" })}
                </p>
                <div className="mt-2 flex flex-col gap-1">
                  {dayEvents.map((event) => (
                    <EventChip key={event.id} event={event} expanded />
                  ))}
                  {dayEvents.length === 0 && (
                    <p className="text-xs text-slate-400">Nenhum evento.</p>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {canEdit && (
        <section className="surface-card p-6">
          <h2 className="font-semibold">Novo evento manual</h2>
          <form action={createCalendarEvent} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              Título
              <input type="text" name="title" required className="field" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Data
              <input type="date" name="date" required className="field" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Tipo
              <select name="type" defaultValue="REUNIAO" className="field">
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {EVENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Processo (opcional)
              <input type="text" name="processNumber" className="field" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Cliente (opcional)
              <select name="clientId" defaultValue="" className="field">
                <option value="">Nenhum</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Responsável (opcional)
              <select name="responsibleUserId" defaultValue="" className="field">
                <option value="">Nenhum</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="self-start btn-primary sm:col-span-3">
              Criar evento
            </button>
          </form>
        </section>
      )}
    </main>
  );
}
