import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from "@/lib/documents/document-labels";
import { uploadDocument } from "./actions";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ proceedingId?: string; clientId?: string; taskId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const canEdit = session.user.role !== "CONSULTA";

  const { proceedingId, clientId, taskId } = await searchParams;

  const [documents, clients, context] = await Promise.all([
    prisma.document.findMany({
      include: { proceeding: true, client: true, uploadedBy: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    proceedingId
      ? prisma.proceeding.findUnique({ where: { id: proceedingId } })
      : null,
  ]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <Link href="/" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Voltar ao dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Documentos</h1>
      </header>

      {canEdit && (
        <section className="surface-card p-6">
          <h2 className="font-semibold">Enviar documento</h2>
          {context && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Vinculado ao processo {context.processNumber}
            </p>
          )}
          <form
            action={uploadDocument}
            className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {taskId && <input type="hidden" name="taskId" value={taskId} />}
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              Nome
              <input type="text" name="name" required className="field" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Tipo
              <select name="type" defaultValue="DIVERSO" className="field">
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {DOCUMENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Processo (opcional)
              <input
                type="text"
                name="processNumber"
                defaultValue={context?.processNumber ?? ""}
                className="field"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Cliente (opcional)
              <select name="clientId" defaultValue={clientId ?? ""} className="field">
                <option value="">Nenhum</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Origem
              <input type="text" name="origin" placeholder="ex.: enviado pelo cliente" className="field" />
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              Descrição
              <textarea name="description" rows={2} className="field" />
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              Arquivo
              <input type="file" name="file" required className="text-sm" />
            </label>
            <button type="submit" className="self-start btn-primary sm:col-span-2">
              Enviar
            </button>
          </form>
        </section>
      )}

      <section className="overflow-x-auto surface-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Processo</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Versão</th>
              <th className="px-4 py-3">Enviado por</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                <td className="px-4 py-3">
                  <Link href={`/documents/${doc.id}`} className="font-medium text-blue-600 underline hover:text-blue-800 dark:text-blue-400">
                    {doc.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{DOCUMENT_TYPE_LABELS[doc.type]}</td>
                <td className="px-4 py-3">{doc.proceeding?.processNumber ?? "—"}</td>
                <td className="px-4 py-3">{doc.client?.name ?? "—"}</td>
                <td className="px-4 py-3">v{doc.currentVersion}</td>
                <td className="px-4 py-3">{doc.uploadedBy?.name ?? "—"}</td>
              </tr>
            ))}
            {documents.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                  Nenhum documento enviado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
