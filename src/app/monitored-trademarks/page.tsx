import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createMonitoredTrademark, toggleMonitoredTrademarkActive } from "./actions";

export default async function MonitoredTrademarksPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const canEdit = session.user.role !== "CONSULTA";

  const [monitored, clients] = await Promise.all([
    prisma.monitoredTrademark.findMany({
      include: { client: true, _count: { select: { matches: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
            ← Voltar ao dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Marcas monitoradas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            O sistema sinaliza semelhanças textuais na RPI para revisão — nunca decide sozinho se há colidência.
          </p>
        </div>
        <Link
          href="/similarity-matches"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-900"
        >
          Ver semelhanças encontradas
        </Link>
      </header>

      {canEdit && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-semibold">Cadastrar marca monitorada</h2>
          <form
            action={createMonitoredTrademark}
            className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              Expressão principal
              <input
                type="text"
                name="mainExpression"
                required
                className="rounded-md border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Variações (separadas por vírgula)
              <input
                type="text"
                name="variations"
                placeholder="ACME, AKME"
                className="rounded-md border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Palavras relevantes (opcional)
              <input
                type="text"
                name="relevantWords"
                className="rounded-md border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Classes NCL (separadas por vírgula)
              <input
                type="text"
                name="niceClasses"
                placeholder="25, 35"
                className="rounded-md border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Termos a ignorar na comparação (opcional)
              <input
                type="text"
                name="ignoredTerms"
                placeholder="COMERCIO, LTDA"
                className="rounded-md border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Titular original (opcional)
              <input
                type="text"
                name="titular"
                className="rounded-md border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Cliente relacionado (opcional)
              <select
                name="clientId"
                defaultValue=""
                className="rounded-md border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="">Nenhum</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Similaridade mínima (0 a 1)
              <input
                type="number"
                name="minSimilarity"
                step="0.05"
                min="0"
                max="1"
                defaultValue="0.7"
                className="rounded-md border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <button
              type="submit"
              className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 sm:col-span-2 dark:bg-slate-100 dark:text-slate-900"
            >
              Cadastrar
            </button>
          </form>
        </section>
      )}

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Expressão</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Classes NCL</th>
              <th className="px-4 py-3">Similaridade mín.</th>
              <th className="px-4 py-3">Semelhanças encontradas</th>
              <th className="px-4 py-3">Status</th>
              {canEdit && <th className="px-4 py-3">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {monitored.map((m) => (
              <tr key={m.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                <td className="px-4 py-3">
                  <p className="font-medium">{m.mainExpression}</p>
                  {m.variations.length > 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Variações: {m.variations.join(", ")}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">{m.client?.name ?? "—"}</td>
                <td className="px-4 py-3">{m.niceClasses.join(", ") || "—"}</td>
                <td className="px-4 py-3">{m.minSimilarity.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/similarity-matches?monitoredTrademarkId=${m.id}`}
                    className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
                  >
                    {m._count.matches}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {m.active ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Ativa
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Inativa
                    </span>
                  )}
                </td>
                {canEdit && (
                  <td className="px-4 py-3">
                    <form action={toggleMonitoredTrademarkActive}>
                      <input type="hidden" name="id" value={m.id} />
                      <button type="submit" className="text-xs text-blue-600 underline hover:text-blue-800 dark:text-blue-400">
                        {m.active ? "Desativar" : "Ativar"}
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
            {monitored.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 7 : 6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                  Nenhuma marca monitorada cadastrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
