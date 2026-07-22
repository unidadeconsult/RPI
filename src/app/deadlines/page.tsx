import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  DEADLINE_URGENCY_LABELS,
  computeDeadlineUrgency,
  type DeadlineUrgency,
} from "@/lib/deadlines/deadline-calc";
import { cancelDeadline, confirmDeadline } from "./actions";
import { ConfirmForm } from "@/components/confirm-form";

const URGENCY_COLORS: Record<DeadlineUrgency, string> = {
  SEM_DATA: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  VENCIDO: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  HOJE: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  URGENTE_3: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  URGENTE_7: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  ATENCAO_15: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  ATENCAO_30: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  NORMAL: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

export default async function DeadlinesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const canEdit = session.user.role !== "CONSULTA";

  const deadlines = await prisma.deadline.findMany({
    where: { status: { not: "CANCELADO" } },
    include: { proceeding: true, confirmedBy: true },
  });

  const today = new Date();
  const rows = deadlines
    .map((d) => {
      const operativeDate = d.confirmedDate ?? d.suggestedDate;
      return { deadline: d, operativeDate, urgency: computeDeadlineUrgency(operativeDate, today) };
    })
    .sort((a, b) => {
      if (!a.operativeDate) return 1;
      if (!b.operativeDate) return -1;
      return a.operativeDate.getTime() - b.operativeDate.getTime();
    });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <Link href="/" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Voltar ao dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Prazos</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Todo prazo é uma sugestão do sistema até ser confirmado por um responsável.
        </p>
      </header>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Alerta</th>
              <th className="px-4 py-3">Processo</th>
              <th className="px-4 py-3">Evento</th>
              <th className="px-4 py-3">Prazo sugerido</th>
              <th className="px-4 py-3">Prazo confirmado</th>
              <th className="px-4 py-3">Data interna</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ deadline, urgency }) => (
              <tr key={deadline.id} className="border-b border-slate-100 align-top last:border-0 dark:border-slate-800">
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${URGENCY_COLORS[urgency]}`}>
                    {DEADLINE_URGENCY_LABELS[urgency]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/proceedings/${deadline.proceedingId}`}
                    className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
                  >
                    {deadline.proceeding.processNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {deadline.eventLabel}
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {deadline.daysConfigured} dias {deadline.countingType?.toLowerCase()}
                  </p>
                </td>
                <td className="px-4 py-3">
                  {deadline.suggestedDate
                    ? new Date(deadline.suggestedDate).toLocaleDateString("pt-BR")
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  {deadline.status === "CONFIRMADO" ? (
                    <>
                      {deadline.confirmedDate &&
                        new Date(deadline.confirmedDate).toLocaleDateString("pt-BR")}
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        por {deadline.confirmedBy?.name}
                      </p>
                    </>
                  ) : (
                    <span className="font-medium text-amber-600 dark:text-amber-400">
                      PRAZO SUGERIDO — CONFERIR
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {deadline.internalDate
                    ? new Date(deadline.internalDate).toLocaleDateString("pt-BR")
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  {canEdit && deadline.status !== "CONFIRMADO" && (
                    <details>
                      <summary className="cursor-pointer text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400">
                        Confirmar prazo
                      </summary>
                      <form action={confirmDeadline} className="mt-2 flex flex-col gap-2">
                        <input type="hidden" name="deadlineId" value={deadline.id} />
                        <label className="flex flex-col gap-1 text-xs">
                          Data confirmada
                          <input
                            type="date"
                            name="confirmedDate"
                            required
                            defaultValue={
                              deadline.suggestedDate
                                ? new Date(deadline.suggestedDate).toISOString().slice(0, 10)
                                : ""
                            }
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-xs">
                          Data interna (opcional)
                          <input
                            type="date"
                            name="internalDate"
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                          />
                        </label>
                        <textarea
                          name="notes"
                          placeholder="Observações"
                          rows={2}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                        />
                        <button
                          type="submit"
                          className="self-start rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900"
                        >
                          Confirmar
                        </button>
                      </form>
                    </details>
                  )}
                  {canEdit && (
                    <ConfirmForm
                      action={cancelDeadline}
                      confirmMessage="Cancelar este prazo? Ele deixará de aparecer como prazo ativo."
                      className="mt-1"
                    >
                      <input type="hidden" name="deadlineId" value={deadline.id} />
                      <button type="submit" className="text-xs text-slate-500 underline hover:text-slate-700 dark:text-slate-400">
                        Cancelar
                      </button>
                    </ConfirmForm>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                  Nenhum prazo cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
