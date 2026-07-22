import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
} from "@/lib/dashboard/task-labels";
import {
  addChecklistItem,
  addTaskComment,
  toggleChecklistItem,
  updateTaskFields,
  updateTaskStatus,
} from "../actions";

type ChecklistItem = { id: string; text: string; done: boolean };

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const [task, users] = await Promise.all([
    prisma.task.findUnique({
      where: { id },
      include: {
        proceeding: { include: { trademarks: true } },
        client: true,
        publication: true,
        responsibleUser: true,
        reviewerUser: true,
        comments: { include: { user: true }, orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  if (!task) notFound();

  const canEdit = session.user.role !== "CONSULTA";
  const checklist = Array.isArray(task.checklist) ? (task.checklist as ChecklistItem[]) : [];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <Link href="/tasks" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Voltar às tarefas
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{task.title}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {task.proceeding && (
            <Link href={`/proceedings/${task.proceeding.id}`} className="underline">
              Processo {task.proceeding.processNumber}
            </Link>
          )}
          {task.client && <> — {task.client.name}</>}
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 surface-card p-6 sm:grid-cols-2">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Status</p>
          {canEdit ? (
            <form action={updateTaskStatus} className="mt-1 flex items-center gap-2">
              <input type="hidden" name="taskId" value={task.id} />
              <select
                name="status"
                defaultValue={task.status}
                className="field"
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {TASK_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="btn-primary"
              >
                Salvar
              </button>
            </form>
          ) : (
            <p>{TASK_STATUS_LABELS[task.status]}</p>
          )}
        </div>

        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Providência sugerida</p>
          <p>{task.providenceSuggested ?? "—"}</p>
        </div>
      </section>

      <section
        key={task.updatedAt.toISOString()}
        className="surface-card p-6"
      >
        <h2 className="font-semibold">Detalhes</h2>
        <form action={updateTaskFields} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input type="hidden" name="taskId" value={task.id} />
          <label className="flex flex-col gap-1 text-sm">
            Responsável
            <select
              name="responsibleUserId"
              defaultValue={task.responsibleUserId ?? ""}
              disabled={!canEdit}
              className="field"
            >
              <option value="">Sem responsável</option>
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
              defaultValue={task.reviewerUserId ?? ""}
              disabled={!canEdit}
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
              defaultValue={task.priority}
              disabled={!canEdit}
              className="field"
            >
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {TASK_PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Data limite interna
            <input
              type="date"
              name="internalDueDate"
              disabled={!canEdit}
              defaultValue={
                task.internalDueDate
                  ? task.internalDueDate.toISOString().slice(0, 10)
                  : ""
              }
              className="field"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            Providência definida
            <textarea
              name="providenceDefined"
              disabled={!canEdit}
              defaultValue={task.providenceDefined ?? ""}
              rows={2}
              className="field"
            />
          </label>
          {canEdit && (
            <button
              type="submit"
              className="self-start btn-primary sm:col-span-2"
            >
              Salvar detalhes
            </button>
          )}
        </form>
      </section>

      <section className="surface-card p-6">
        <h2 className="font-semibold">Checklist</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {checklist.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              <form action={toggleChecklistItem}>
                <input type="hidden" name="taskId" value={task.id} />
                <input type="hidden" name="itemId" value={item.id} />
                <button type="submit" disabled={!canEdit} className="text-lg leading-none">
                  {item.done ? "☑" : "☐"}
                </button>
              </form>
              <span className={item.done ? "text-slate-400 line-through" : ""}>{item.text}</span>
            </li>
          ))}
          {checklist.length === 0 && (
            <li className="text-sm text-slate-500 dark:text-slate-400">Nenhum item ainda.</li>
          )}
        </ul>
        {canEdit && (
          <form action={addChecklistItem} className="mt-3 flex gap-2">
            <input type="hidden" name="taskId" value={task.id} />
            <input
              type="text"
              name="text"
              placeholder="Novo item"
              className="flex-1 field"
            />
            <button
              type="submit"
              className="btn-secondary"
            >
              Adicionar
            </button>
          </form>
        )}
      </section>

      <section className="surface-card p-6">
        <h2 className="font-semibold">Comentários</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {task.comments.map((comment) => (
            <li key={comment.id} className="border-b border-slate-100 pb-2 text-sm last:border-0 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {comment.user.name} — {new Date(comment.createdAt).toLocaleString("pt-BR")}
              </p>
              <p>{comment.body}</p>
            </li>
          ))}
          {task.comments.length === 0 && (
            <li className="text-sm text-slate-500 dark:text-slate-400">Nenhum comentário ainda.</li>
          )}
        </ul>
        {canEdit && (
          <form action={addTaskComment} className="mt-3 flex flex-col gap-2">
            <input type="hidden" name="taskId" value={task.id} />
            <textarea
              name="body"
              rows={2}
              placeholder="Adicionar comentário"
              className="field"
            />
            <button
              type="submit"
              className="self-start btn-secondary"
            >
              Comentar
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
