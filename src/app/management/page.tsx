import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildManagementData } from "@/lib/management/management-data";
import { CATEGORY_LABELS, DISPATCH_CATEGORIES } from "@/lib/dashboard/publication-filters";
import { BarChart } from "./bar-chart";
import { CATEGORICAL_PALETTE, SEQUENTIAL_BLUE } from "./palette";

export default async function ManagementPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const data = await buildManagementData(prisma);

  const editionRows = data.publicationsByEdition.map((e) => ({
    key: e.rpiEditionId,
    label: `RPI nº ${e.number}`,
    value: e.count,
    color: SEQUENTIAL_BLUE,
    href: `/?rpiNumber=${e.number}`,
  }));

  const categoryRows = DISPATCH_CATEGORIES.map((category, index) => {
    const found = data.categoryCounts.find((c) => c.category === category);
    return {
      key: category,
      label: CATEGORY_LABELS[category],
      value: found?.count ?? 0,
      color: CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length],
      href: `/?category=${category}`,
    };
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <Link href="/" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Voltar ao dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Painel gerencial</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Indicadores operacionais — clique em qualquer indicador para abrir os registros correspondentes.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Prazos abertos" value={data.deadlinesOpen} href="/deadlines" />
        <StatCard label="Prazos vencidos" value={data.deadlinesOverdue} href="/deadlines" />
        <StatCard
          label="Tempo médio de revisão"
          value={
            data.avgReviewTimeHours === null
              ? "—"
              : `${data.avgReviewTimeHours.toFixed(1)}h`
          }
        />
        <StatCard label="Tarefas atrasadas" value={data.tasksOverdue} href="/tasks?overdue=1" />
        <StatCard
          label="Processos sem cliente"
          value={data.proceedingsWithoutClient.total}
          href="/?semCliente=on"
        />
        <StatCard
          label="Códigos de despacho não classificados"
          value={data.unknownDispatchCodes}
          href="/?category=OUTROS_NAO_CLASSIFICADO"
        />
        <StatCard label="Correções feitas pelo usuário" value={data.correctionsCount} />
        <StatCard
          label="Processos sem documento anexado"
          value={data.documentsPendingProceedings.total}
        />
        <StatCard label="Mensagens preparadas" value={data.messagesPreparedCount} href="/messages" />
        <StatCard
          label="Marcas semelhantes relevantes"
          value={data.similarityRelevantCount}
          note="Monitoramento de marcas semelhantes ainda não implementado — número honesto até a próxima fase."
        />
      </section>

      {(data.proceedingsWithoutClient.sample.length > 0 ||
        data.documentsPendingProceedings.sample.length > 0) && (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data.proceedingsWithoutClient.sample.length > 0 && (
            <SampleList
              title="Processos sem cliente (amostra)"
              items={data.proceedingsWithoutClient.sample}
            />
          )}
          {data.documentsPendingProceedings.sample.length > 0 && (
            <SampleList
              title="Processos sem documento anexado (amostra)"
              items={data.documentsPendingProceedings.sample}
            />
          )}
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold">Publicações por edição da RPI</h2>
        <div className="mt-4">
          <BarChart rows={editionRows} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold">Publicações por categoria de despacho</h2>
        <div className="mt-4">
          <BarChart rows={categoryRows} />
        </div>
      </section>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <h2 className="p-6 pb-0 font-semibold">Tarefas por responsável</h2>
        <table className="mt-4 w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-6 py-3">Responsável</th>
              <th className="px-6 py-3">Total</th>
              <th className="px-6 py-3">Atrasadas</th>
            </tr>
          </thead>
          <tbody>
            {data.tasksByResponsible.map((r) => (
              <tr key={r.userId} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                <td className="px-6 py-3">
                  <Link
                    href={`/tasks?responsibleUserId=${r.userId}`}
                    className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
                  >
                    {r.name}
                  </Link>
                </td>
                <td className="px-6 py-3 tabular-nums">{r.total}</td>
                <td className="px-6 py-3 tabular-nums">{r.overdue}</td>
              </tr>
            ))}
            {data.tasksByResponsible.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                  Nenhuma tarefa com responsável definido ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <h2 className="p-6 pb-0 font-semibold">Volume de processos por cliente</h2>
        <table className="mt-4 w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-6 py-3">Cliente</th>
              <th className="px-6 py-3">Processos na carteira</th>
            </tr>
          </thead>
          <tbody>
            {data.clientProcessVolume.map((c) => (
              <tr key={c.clientId} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                <td className="px-6 py-3">
                  <Link
                    href={`/clients/${c.clientId}`}
                    className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="px-6 py-3 tabular-nums">{c.total}</td>
              </tr>
            ))}
            {data.clientProcessVolume.length === 0 && (
              <tr>
                <td colSpan={2} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                  Nenhum processo vinculado a cliente ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  href,
  note,
}: {
  label: string;
  value: number | string;
  href?: string;
  note?: string;
}) {
  const card = (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      {note && <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{note}</p>}
    </div>
  );

  if (!href) return card;

  return (
    <Link href={href} className="block hover:opacity-80">
      {card}
    </Link>
  );
}

function SampleList({ title, items }: { title: string; items: { id: string; processNumber: string }[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-2 flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={`/proceedings/${item.id}`}
              className="text-sm text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
            >
              {item.processNumber}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
