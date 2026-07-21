import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CATEGORY_LABELS } from "@/lib/dashboard/publication-filters";
import { linkExistingClient } from "@/app/clients/actions";

export default async function ProceedingHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const proceeding = await prisma.proceeding.findUnique({
    where: { id },
    include: {
      trademarks: { include: { classes: true } },
      parties: true,
      publications: {
        include: {
          rpiEdition: true,
          dispatchCode: true,
          responsible: true,
          attorneyLinks: { include: { attorney: true } },
        },
      },
      clientProcesses: { include: { client: true } },
      deadlines: true,
      tasks: true,
      documents: true,
    },
  });

  if (!proceeding) notFound();

  const publications = [...proceeding.publications].sort(
    (a, b) => a.rpiEdition.publicationDate.getTime() - b.rpiEdition.publicationDate.getTime(),
  );
  const mostRecent = publications[publications.length - 1];

  const auditLogs = await prisma.auditLog.findMany({
    where: { entityType: "Publication", entityId: { in: publications.map((p) => p.id) } },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  // Titulares distintos (mesmo nome pode se repetir em mais de uma publicacao)
  const holderNames = [...new Set(proceeding.parties.map((p) => p.name))];
  const clientLink = proceeding.clientProcesses[0];
  const canEdit = session.user.role !== "CONSULTA";

  const clients = clientLink || !canEdit ? [] : await prisma.client.findMany({ orderBy: { name: "asc" } });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <Link href="/" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Voltar ao dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Processo {proceeding.processNumber}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {proceeding.trademarks[0]?.name ?? "Marca não identificada"} —{" "}
          {holderNames.join(" / ") || "Titular não identificado"}
        </p>
      </header>

      {!clientLink && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-medium">
            PROCESSO ENCONTRADO NA RPI, MAS NÃO LOCALIZADO NA CARTEIRA
          </p>
          {canEdit && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {clients.length > 0 && (
                <form action={linkExistingClient} className="flex items-center gap-2">
                  <input type="hidden" name="proceedingId" value={proceeding.id} />
                  <select
                    name="clientId"
                    required
                    className="rounded-md border border-amber-300 bg-white px-2 py-1.5 text-sm dark:border-amber-700 dark:bg-slate-950"
                  >
                    <option value="">Selecione um cliente existente</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-md bg-amber-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-800"
                  >
                    Vincular
                  </button>
                </form>
              )}
              <Link
                href={`/clients?proceedingId=${proceeding.id}`}
                className="text-sm font-medium text-amber-900 underline dark:text-amber-200"
              >
                Cadastrar novo cliente
              </Link>
            </div>
          )}
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryStat
          label="Situação atual"
          value={mostRecent ? CATEGORY_LABELS[mostRecent.category] : "—"}
        />
        <SummaryStat label="Último despacho" value={mostRecent?.dispatchCode?.code ?? "—"} />
        <SummaryStat label="Próximo prazo" value="Ainda não implementado" />
        <SummaryStat
          label="Providência pendente"
          value={mostRecent?.definedProvidence ?? mostRecent?.suggestedProvidence ?? "—"}
        />
        <SummaryStat label="Responsável" value={mostRecent?.responsible?.name ?? "—"} />
        <SummaryStat
          label="Cliente relacionado"
          value={clientLink ? clientLink.client.name : "Não vinculado à carteira"}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold">Linha do tempo</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Mostra apenas as publicações efetivamente encontradas para este processo, em
          ordem cronológica — sem presumir uma sequência fixa de eventos.
        </p>

        <ol className="mt-4 flex flex-col gap-4 border-l border-slate-200 pl-4 dark:border-slate-800">
          {publications.map((pub) => (
            <li key={pub.id} className="relative">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-slate-400" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {new Date(pub.rpiEdition.publicationDate).toLocaleDateString("pt-BR")} — RPI{" "}
                {pub.rpiEdition.number}
              </p>
              <p className="font-medium">
                {CATEGORY_LABELS[pub.category]}
                {pub.dispatchCode && <> — {pub.dispatchCode.code}</>}
              </p>
              {pub.attorneyLinks.map((link) => (
                <p key={link.id} className="text-xs text-slate-500 dark:text-slate-400">
                  Procurador: {link.attorney.nameRaw}{" "}
                  {link.matchStatus === "DUVIDOSO_REVISAR" && "(vínculo não confirmado)"}
                </p>
              ))}
              <Link
                href={`/publications/${pub.id}`}
                className="text-xs text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
              >
                Ver detalhes
              </Link>
            </li>
          ))}
          {publications.length === 0 && (
            <li className="text-sm text-slate-500 dark:text-slate-400">
              Nenhuma publicação registrada para este processo.
            </li>
          )}
        </ol>
      </section>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <EmptyModuleCard title="Documentos" count={proceeding.documents.length} />
        <EmptyModuleCard title="Tarefas" count={proceeding.tasks.length} />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold">Histórico de alterações</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {auditLogs.map((log) => (
            <li key={log.id} className="border-b border-slate-100 pb-2 last:border-0 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {new Date(log.createdAt).toLocaleString("pt-BR")} — {log.user?.name ?? "sistema"}
              </span>
              <p>{describeAuditAction(log.action)}</p>
            </li>
          ))}
          {auditLogs.length === 0 && (
            <li className="text-sm text-slate-500 dark:text-slate-400">
              Nenhuma alteração registrada ainda.
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function EmptyModuleCard({ title, count }: { title: string; count: number }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
      <p className="font-medium text-slate-700 dark:text-slate-300">{title}</p>
      <p className="mt-1">
        {count > 0 ? `${count} registro(s)` : "Nenhum registro — módulo ainda em construção."}
      </p>
    </div>
  );
}

function describeAuditAction(action: string): string {
  const labels: Record<string, string> = {
    UPDATE_PUBLICATION_FIELDS: "Dados da publicação foram corrigidos",
    TOGGLE_REVIEW_STATUS: "Status de revisão foi alterado",
    IMPORT_RPI: "RPI importada",
  };
  return labels[action] ?? action;
}
