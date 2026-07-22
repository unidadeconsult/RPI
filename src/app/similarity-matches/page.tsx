import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  SIMILARITY_MATCH_TYPE_LABELS,
  SIMILARITY_STATUS_LABELS,
  SIMILARITY_STATUSES,
} from "@/lib/similarity/similarity-labels";
import { reviewSimilarityMatch } from "./actions";

export default async function SimilarityMatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; monitoredTrademarkId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const canEdit = session.user.role !== "CONSULTA";

  const { status, monitoredTrademarkId } = await searchParams;
  const statusFilter = SIMILARITY_STATUSES.includes(status as (typeof SIMILARITY_STATUSES)[number])
    ? (status as (typeof SIMILARITY_STATUSES)[number])
    : "NOVO";

  const matches = await prisma.similarityMatch.findMany({
    where: {
      status: statusFilter,
      ...(monitoredTrademarkId ? { monitoredTrademarkId } : {}),
    },
    include: {
      monitoredTrademark: true,
      matchedTrademark: true,
      reviewedBy: true,
      publication: { include: { proceeding: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <Link href="/" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Voltar ao dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Semelhanças de marcas</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cada semelhança é apenas uma sinalização textual — a decisão sobre colidência é sempre humana.
        </p>
        <Link
          href="/monitored-trademarks"
          className="mt-1 inline-block text-sm text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
        >
          Gerenciar marcas monitoradas
        </Link>
      </header>

      <div className="flex flex-wrap gap-2">
        {SIMILARITY_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/similarity-matches?status=${s}${monitoredTrademarkId ? `&monitoredTrademarkId=${monitoredTrademarkId}` : ""}`}
            className={`rounded-full px-3 py-1 text-xs ${
              statusFilter === s
                ? "pill-active"
                : "pill"
            }`}
          >
            {SIMILARITY_STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      <section className="overflow-x-auto surface-card">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Marca monitorada</th>
              <th className="px-4 py-3">Processo encontrado</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Detalhes</th>
              {canEdit && statusFilter === "NOVO" && <th className="px-4 py-3">Ações</th>}
              {statusFilter !== "NOVO" && <th className="px-4 py-3">Revisado por</th>}
            </tr>
          </thead>
          <tbody>
            {matches.map((match) => (
              <tr key={match.id} className="border-b border-slate-100 align-top last:border-0 dark:border-slate-800">
                <td className="px-4 py-3">
                  <p className="font-medium">{match.monitoredTrademark.mainExpression}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    correspondeu a &quot;{match.matchedTerm}&quot;
                  </p>
                </td>
                <td className="px-4 py-3">
                  {match.publication.proceeding ? (
                    <Link
                      href={`/proceedings/${match.publication.proceeding.id}`}
                      className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
                    >
                      {match.publication.proceeding.processNumber}
                    </Link>
                  ) : (
                    "—"
                  )}
                  {match.matchedTrademark && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{match.matchedTrademark.name}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <p>{(match.score * 100).toFixed(1)}%</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {SIMILARITY_MATCH_TYPE_LABELS[match.matchType]}
                  </p>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                  <p>{match.reasonDetails}</p>
                  {match.notes && <p className="mt-1 italic">Obs.: {match.notes}</p>}
                </td>
                {canEdit && statusFilter === "NOVO" && (
                  <td className="px-4 py-3">
                    <form action={reviewSimilarityMatch} className="flex flex-col gap-2">
                      <input type="hidden" name="matchId" value={match.id} />
                      <textarea
                        name="notes"
                        rows={2}
                        placeholder="Observações (opcional)"
                        className="field text-xs"
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          name="status"
                          value="RELEVANTE"
                          className="rounded-md bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700"
                        >
                          Marcar relevante
                        </button>
                        <button
                          type="submit"
                          name="status"
                          value="FALSO_POSITIVO"
                          className="btn-secondary"
                        >
                          Falso positivo
                        </button>
                      </div>
                    </form>
                  </td>
                )}
                {statusFilter !== "NOVO" && (
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                    {match.reviewedBy?.name ?? "—"}
                    {match.reviewedAt && (
                      <p>{new Date(match.reviewedAt).toLocaleDateString("pt-BR")}</p>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {matches.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                  Nenhuma semelhança encontrada nesta categoria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
