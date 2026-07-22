import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents/document-labels";
import { uploadDocument } from "../actions";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const canEdit = session.user.role !== "CONSULTA";

  const { id } = await params;

  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      proceeding: true,
      client: true,
      uploadedBy: true,
      versions: { include: { uploadedBy: true }, orderBy: { versionNumber: "desc" } },
    },
  });

  if (!document) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <Link href="/documents" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Voltar aos documentos
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{document.name}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {DOCUMENT_TYPE_LABELS[document.type]}
          {document.proceeding && <> — Processo {document.proceeding.processNumber}</>}
          {document.client && <> — {document.client.name}</>}
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <InfoItem label="Descrição" value={document.description ?? "—"} />
          <InfoItem label="Origem" value={document.origin ?? "—"} />
          <InfoItem label="Status" value={document.status} />
          <InfoItem label="Versão atual" value={`v${document.currentVersion}`} />
        </div>
        <a
          href={`/api/documents/${document.id}/download`}
          className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900"
        >
          Baixar versão atual
        </a>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold">Histórico de versões</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {document.versions.map((v) => (
            <li key={v.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 dark:border-slate-800">
              <div>
                <span className="font-medium">v{v.versionNumber}</span>
                <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                  {new Date(v.createdAt).toLocaleString("pt-BR")} — {v.uploadedBy?.name ?? "—"}
                </span>
                {v.changeNote && <p className="text-xs text-slate-500 dark:text-slate-400">{v.changeNote}</p>}
              </div>
              <a
                href={`/api/documents/${document.id}/download?version=${v.versionNumber}`}
                className="text-xs text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
              >
                Baixar
              </a>
            </li>
          ))}
        </ul>
      </section>

      {canEdit && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-semibold">Enviar nova versão</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            A versão anterior não é substituída — fica preservada no histórico.
          </p>
          <form action={uploadDocument} className="mt-3 flex flex-col gap-3">
            <input type="hidden" name="existingDocumentId" value={document.id} />
            <input
              type="text"
              name="changeNote"
              placeholder="O que mudou nesta versão?"
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
            <input type="file" name="file" required className="text-sm" />
            <button type="submit" className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900">
              Enviar nova versão
            </button>
          </form>
        </section>
      )}
    </main>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p>{value}</p>
    </div>
  );
}
