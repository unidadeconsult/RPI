import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  MESSAGE_CATEGORY_LABELS,
  MESSAGE_CHANNEL_LABELS,
  MESSAGE_DRAFT_STATUS_LABELS,
} from "@/lib/messages/message-labels";
import { createMessageDraft } from "./actions";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ processNumber?: string; clientId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const canEdit = session.user.role !== "CONSULTA";

  const { processNumber, clientId } = await searchParams;

  const [drafts, templates, clients] = await Promise.all([
    prisma.messageDraft.findMany({
      include: { template: true, client: true, proceeding: true, preparedBy: true },
      orderBy: { preparedAt: "desc" },
    }),
    prisma.messageTemplate.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
            ← Voltar ao dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Mensagens</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            O sistema prepara rascunhos — nenhuma mensagem é enviada automaticamente.
          </p>
        </div>
        <Link href="/messages/templates" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-900">
          Modelos
        </Link>
      </header>

      {canEdit && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-semibold">Preparar rascunho</h2>
          <form action={createMessageDraft} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              Modelo
              <select name="templateId" required className="rounded-md border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950">
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({MESSAGE_CATEGORY_LABELS[t.category]})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Processo (opcional, preenche as variáveis)
              <input type="text" name="processNumber" defaultValue={processNumber ?? ""} className="rounded-md border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Cliente (opcional)
              <select name="clientId" defaultValue={clientId ?? ""} className="rounded-md border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950">
                <option value="">Nenhum</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Destinatário
              <input type="text" name="recipient" placeholder="telefone ou e-mail" className="rounded-md border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Documentos solicitados (opcional)
              <input type="text" name="documentos" className="rounded-md border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <button type="submit" className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 sm:col-span-2 dark:bg-slate-100 dark:text-slate-900">
              Preparar rascunho
            </button>
          </form>
        </section>
      )}

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Canal</th>
              <th className="px-4 py-3">Processo</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Destinatário</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Preparado por</th>
            </tr>
          </thead>
          <tbody>
            {drafts.map((draft) => (
              <tr key={draft.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                <td className="px-4 py-3">
                  <Link href={`/messages/${draft.id}`} className="font-medium text-blue-600 underline hover:text-blue-800 dark:text-blue-400">
                    {MESSAGE_CHANNEL_LABELS[draft.channel]}
                  </Link>
                </td>
                <td className="px-4 py-3">{draft.proceeding?.processNumber ?? "—"}</td>
                <td className="px-4 py-3">{draft.client?.name ?? "—"}</td>
                <td className="px-4 py-3">{draft.recipient ?? "—"}</td>
                <td className="px-4 py-3">{MESSAGE_DRAFT_STATUS_LABELS[draft.status]}</td>
                <td className="px-4 py-3">{draft.preparedBy?.name ?? "—"}</td>
              </tr>
            ))}
            {drafts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                  Nenhum rascunho preparado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
