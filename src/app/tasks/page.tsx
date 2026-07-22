import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/lib/dashboard/task-labels";
import { createTask } from "./actions";
import { TASK_STATUSES } from "@/lib/dashboard/task-labels";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    publicationId?: string;
    responsibleUserId?: string;
    overdue?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { status, publicationId, responsibleUserId, overdue } = await searchParams;
  const canEdit = session.user.role !== "CONSULTA";
  const statusFilter = TASK_STATUSES.includes(status as (typeof TASK_STATUSES)[number])
    ? (status as (typeof TASK_STATUSES)[number])
    : undefined;
  const overdueFilter = overdue === "1";

  const [tasks, users, publication] = await Promise.all([
    prisma.task.findMany({
      where: {
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(responsibleUserId ? { responsibleUserId } : {}),
        ...(overdueFilter
          ? {
              internalDueDate: { lt: new Date() },
              status: { notIn: ["CONCLUIDO", "CANCELADO", "SEM_PROVIDENCIA"] },
            }
          : {}),
      },
      include: {
        proceeding: true,
        client: true,
        responsibleUser: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    publicationId
      ? prisma.publication.findUnique({
          where: { id: publicationId },
          include: { proceeding: { include: { trademarks: true } } },
        })
      : null,
  ]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <Link href="/" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Voltar ao dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Tarefas</h1>
      </header>

      {canEdit && (
        <section className="surface-card p-6">
          <h2 className="font-semibold">Nova tarefa</h2>
          {publication && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Vinculada ao processo {publication.proceeding?.processNumber} —{" "}
              {publication.proceeding?.trademarks[0]?.name}
            </p>
          )}
          <form action={createTask} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {publicationId && <input type="hidden" name="publicationId" value={publicationId} />}
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              Título
              <input
                type="text"
                name="title"
                required
                className="field"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Responsável
              <select
                name="responsibleUserId"
                className="field"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Revisor
              <select
                name="reviewerUserId"
                defaultValue=""
                className="field"
              >
                <option value="">Sem revisor</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Prioridade
              <select
                name="priority"
                defaultValue="MEDIA"
                className="field"
              >
                {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Data limite interna
              <input
                type="date"
                name="internalDueDate"
                className="field"
              />
            </label>
            <button
              type="submit"
              className="self-start btn-primary sm:col-span-2"
            >
              Criar tarefa
            </button>
          </form>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <Link
          href="/tasks"
          className={`rounded-full px-3 py-1 text-xs ${
            !status
              ? "pill-active"
              : "pill"
          }`}
        >
          Todos
        </Link>
        {TASK_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/tasks?status=${s}`}
            className={`rounded-full px-3 py-1 text-xs ${
              status === s
                ? "pill-active"
                : "pill"
            }`}
          >
            {TASK_STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      <section className="overflow-x-auto surface-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Processo</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3">Prioridade</th>
              <th className="px-4 py-3">Prazo interno</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                <td className="px-4 py-3">
                  <Link
                    href={`/tasks/${task.id}`}
                    className="font-medium text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
                  >
                    {task.title}
                  </Link>
                </td>
                <td className="px-4 py-3">{task.proceeding?.processNumber ?? "—"}</td>
                <td className="px-4 py-3">{task.client?.name ?? "—"}</td>
                <td className="px-4 py-3">{task.responsibleUser?.name ?? "—"}</td>
                <td className="px-4 py-3">{TASK_PRIORITY_LABELS[task.priority]}</td>
                <td className="px-4 py-3">
                  {task.internalDueDate
                    ? new Date(task.internalDueDate).toLocaleDateString("pt-BR")
                    : "—"}
                </td>
                <td className="px-4 py-3">{TASK_STATUS_LABELS[task.status]}</td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                  Nenhuma tarefa encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
