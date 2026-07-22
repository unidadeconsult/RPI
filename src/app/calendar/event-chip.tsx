import Link from "next/link";
import { EVENT_TYPE_LABELS } from "@/lib/calendar/event-labels";
import { rescheduleCalendarEvent, toggleCalendarEventConfirmed } from "./actions";
import type { CalendarEventType } from "@/generated/prisma/client";
import type { UnifiedEvent } from "./page";

const TYPE_COLORS: Record<string, string> = {
  PRAZO: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  TAREFA: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  PAGAMENTO: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  REUNIAO: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  SOLICITACAO_CLIENTE: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  MANIFESTACAO: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
  RECURSO: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  EXIGENCIA: "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300",
  RENOVACAO: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
  INTERNO: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export function EventChip({ event, expanded }: { event: UnifiedEvent; expanded?: boolean }) {
  const color = TYPE_COLORS[event.type] ?? TYPE_COLORS.INTERNO;
  const label = EVENT_TYPE_LABELS[event.type as CalendarEventType] ?? event.type;

  const content = (
    <span
      className={`block truncate rounded px-1.5 py-0.5 text-xs ${color} ${
        event.confirmed ? "" : "opacity-90"
      }`}
      title={`${label}: ${event.title}`}
    >
      {event.title}
    </span>
  );

  if (!expanded) {
    return event.href ? <Link href={event.href}>{content}</Link> : content;
  }

  return (
    <div className="rounded-md border border-slate-200 p-2 dark:border-slate-800">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className={`rounded px-1.5 py-0.5 text-xs ${color}`}>{label}</span>
          {event.href ? (
            <Link href={event.href} className="ml-2 font-medium underline">
              {event.title}
            </Link>
          ) : (
            <span className="ml-2 font-medium">{event.title}</span>
          )}
          {event.processNumber && (
            <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
              proc. {event.processNumber}
            </span>
          )}
        </div>
        <span className="text-xs">{event.confirmed ? "Confirmado" : "Não confirmado"}</span>
      </div>

      {event.kind === "MANUAL" && (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
          <form action={toggleCalendarEventConfirmed}>
            <input type="hidden" name="eventId" value={event.id} />
            <button type="submit" className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400">
              {event.confirmed ? "Marcar como não confirmado" : "Marcar como concluído"}
            </button>
          </form>
          <details>
            <summary className="cursor-pointer text-blue-600 hover:text-blue-800 dark:text-blue-400">
              Reagendar
            </summary>
            <form action={rescheduleCalendarEvent} className="mt-1 flex items-center gap-2">
              <input type="hidden" name="eventId" value={event.id} />
              <input
                type="date"
                name="date"
                required
                className="field text-xs"
              />
              <button type="submit" className="btn-primary">
                Salvar
              </button>
            </form>
          </details>
        </div>
      )}
    </div>
  );
}
