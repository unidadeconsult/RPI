import Link from "next/link";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  CATEGORY_LABELS,
  DISPATCH_CATEGORIES,
  PAGE_SIZE,
  buildPublicationWhere,
  parsePublicationFilters,
} from "@/lib/dashboard/publication-filters";
import { toggleReviewStatus } from "./dashboard-actions";
import type { DispatchCategory } from "@/generated/prisma/client";

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function DashboardHomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const resolvedSearchParams = await searchParams;
  const filters = parsePublicationFilters(resolvedSearchParams);
  const where = buildPublicationWhere(filters);
  const canReview = session.user.role !== "CONSULTA";

  const [
    latestEdition,
    totalPublications,
    totalNaoRevisado,
    categoryCounts,
    proceedingIdsWithPublication,
    filteredTotal,
    publications,
  ] = await Promise.all([
    prisma.rpiEdition.findFirst({ orderBy: { importedAt: "desc" } }),
    prisma.publication.count(),
    prisma.publication.count({ where: { reviewStatus: "NAO_REVISADO" } }),
    prisma.publication.groupBy({ by: ["category"], _count: { _all: true } }),
    prisma.publication.findMany({
      where: { proceedingId: { not: null } },
      distinct: ["proceedingId"],
      select: { proceedingId: true },
    }),
    prisma.publication.count({ where }),
    prisma.publication.findMany({
      where,
      include: {
        rpiEdition: true,
        dispatchCode: true,
        parties: true,
        proceeding: { include: { trademarks: { include: { classes: true } } } },
        attorneyLinks: { include: { attorney: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const proceedingIds = proceedingIdsWithPublication
    .map((p) => p.proceedingId)
    .filter((id): id is string => Boolean(id));
  const linkedProceedingIds = proceedingIds.length
    ? await prisma.clientProcess.findMany({
        where: { proceedingId: { in: proceedingIds } },
        distinct: ["proceedingId"],
        select: { proceedingId: true },
      })
    : [];
  const totalProcessosForaDaCarteira = proceedingIds.length - linkedProceedingIds.length;

  const categoryCountMap = new Map(categoryCounts.map((c) => [c.category, c._count._all]));
  const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));

  const today = new Date();
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);

  const [prazosUrgentes, tarefasAtrasadas] = await Promise.all([
    prisma.deadline.count({
      where: {
        status: { not: "CANCELADO" },
        OR: [
          { confirmedDate: { lte: in7Days } },
          { AND: [{ confirmedDate: null }, { suggestedDate: { lte: in7Days } }] },
        ],
      },
    }),
    prisma.task.count({
      where: {
        internalDueDate: { lt: today },
        status: { notIn: ["CONCLUIDO", "CANCELADO", "SEM_PROVIDENCIA"] },
      },
    }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">RPI Manager</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Publicações em que JANE GLAUCIA VIEIRA aparece como procuradora
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/clients"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-900"
          >
            Clientes
          </Link>
          <Link
            href="/tasks"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-900"
          >
            Tarefas
          </Link>
          <Link
            href="/deadlines"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-900"
          >
            Prazos
          </Link>
          <Link
            href="/import"
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900"
          >
            Importar RPI
          </Link>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {session!.user.name} · {session!.user.role}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-900"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Última RPI importada"
          value={latestEdition ? latestEdition.number : "—"}
        />
        <StatCard
          label="Data da última importação"
          value={
            latestEdition
              ? new Date(latestEdition.importedAt).toLocaleDateString("pt-BR")
              : "—"
          }
        />
        <StatCard label="Total de publicações" value={totalPublications} />
        <StatCard label="Pendentes de revisão" value={totalNaoRevisado} />
        <StatCard
          label="Processos fora da carteira"
          value={Math.max(0, totalProcessosForaDaCarteira)}
        />
        <StatCard label="Prazos urgentes (7 dias)" value={prazosUrgentes} />
        <StatCard label="Tarefas atrasadas" value={tarefasAtrasadas} />
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {DISPATCH_CATEGORIES.map((category) => (
          <CategoryCard
            key={category}
            category={category}
            count={categoryCountMap.get(category) ?? 0}
            active={filters.category === category}
          />
        ))}
      </section>

      <FilterForm filters={filters} />

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Processo</th>
              <th className="px-4 py-3">Marca</th>
              <th className="px-4 py-3">Titular</th>
              <th className="px-4 py-3">Classe</th>
              <th className="px-4 py-3">/PE</th>
              <th className="px-4 py-3">Confiança</th>
              <th className="px-4 py-3">Revisão</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {publications.map((pub) => {
              const trademark = pub.proceeding?.trademarks[0];
              const niceClasses = trademark?.classes.map((c) => c.niceClass).join(", ");
              const attorney = pub.attorneyLinks[0];
              return (
                <tr
                  key={pub.id}
                  className="border-b border-slate-100 align-top last:border-0 dark:border-slate-800"
                >
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium dark:bg-slate-800">
                      {CATEGORY_LABELS[pub.category]}
                    </span>
                    {pub.categoryIsUnknownCode && (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                        código não classificado
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">{pub.dispatchCode?.code ?? "—"}</td>
                  <td className="px-4 py-3">
                    {pub.proceedingId ? (
                      <Link
                        href={`/proceedings/${pub.proceedingId}`}
                        className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
                      >
                        {pub.processNumberRaw ?? "—"}
                      </Link>
                    ) : (
                      (pub.processNumberRaw ?? "—")
                    )}
                  </td>
                  <td className="px-4 py-3">{trademark?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    {pub.parties.map((party) => party.name).join(" / ") || "—"}
                  </td>
                  <td className="px-4 py-3">{niceClasses || "—"}</td>
                  <td className="px-4 py-3">
                    <PeBadge status={pub.peStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <ConfidenceBadge level={pub.confidenceLevel} />
                    {attorney?.matchStatus === "DUVIDOSO_REVISAR" && (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                        vínculo não confirmado — revisar
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        pub.reviewStatus === "REVISADO"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-500 dark:text-slate-400"
                      }
                    >
                      {pub.reviewStatus === "REVISADO" ? "Revisado" : "Não revisado"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/publications/${pub.id}`}
                        className="text-xs font-medium text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
                      >
                        Abrir detalhes
                      </Link>
                      <details>
                        <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400">
                          Ver trecho original
                        </summary>
                        <pre className="mt-2 max-w-xs whitespace-pre-wrap rounded-md bg-slate-50 p-2 text-xs dark:bg-slate-950">
                          {pub.sourceExcerpt}
                        </pre>
                      </details>
                      {canReview && (
                        <form action={toggleReviewStatus}>
                          <input type="hidden" name="publicationId" value={pub.id} />
                          <button
                            type="submit"
                            className="text-xs font-medium text-slate-700 underline hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                          >
                            {pub.reviewStatus === "REVISADO"
                              ? "Marcar como não revisado"
                              : "Marcar como revisado"}
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {publications.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                  Nenhuma publicação encontrada para os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <Pagination page={filters.page} totalPages={totalPages} searchParams={resolvedSearchParams} />
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function CategoryCard({
  category,
  count,
  active,
}: {
  category: DispatchCategory;
  count: number;
  active: boolean;
}) {
  return (
    <Link
      href={active ? "/" : `/?category=${category}`}
      className={`rounded-xl border p-3 text-sm transition ${
        active
          ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
          : "border-slate-200 bg-white hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900"
      }`}
    >
      <p className="text-xs opacity-80">{CATEGORY_LABELS[category]}</p>
      <p className="mt-1 text-xl font-semibold">{count}</p>
    </Link>
  );
}

function PeBadge({ status }: { status: string }) {
  if (status === "CONFIRMADO_PE") {
    return (
      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
        PE
      </span>
    );
  }
  if (status === "NAO_CONFIRMADO_REVISAR") {
    return (
      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
        revisar
      </span>
    );
  }
  return <span className="text-xs text-slate-400">—</span>;
}

function ConfidenceBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    ALTA: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    MEDIA: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    BAIXA: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs ${colors[level] ?? ""}`}>{level}</span>
  );
}

function FilterForm({ filters }: { filters: ReturnType<typeof parsePublicationFilters> }) {
  return (
    <form className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <TextField label="Nº da RPI" name="rpiNumber" defaultValue={filters.rpiNumber} />
        <TextField label="Código" name="dispatchCode" defaultValue={filters.dispatchCode} />
        <TextField label="Processo" name="processNumber" defaultValue={filters.processNumber} />
        <TextField label="Marca" name="trademark" defaultValue={filters.trademark} />
        <TextField label="Titular" name="holder" defaultValue={filters.holder} />
        <TextField label="UF" name="uf" defaultValue={filters.uf} />
        <SelectField
          label="Confiança"
          name="confidence"
          defaultValue={filters.confidence}
          options={[
            ["", "Todas"],
            ["ALTA", "Alta"],
            ["MEDIA", "Média"],
            ["BAIXA", "Baixa"],
          ]}
        />
        <SelectField
          label="Revisão"
          name="reviewStatus"
          defaultValue={filters.reviewStatus}
          options={[
            ["", "Todos"],
            ["NAO_REVISADO", "Não revisado"],
            ["REVISADO", "Revisado"],
          ]}
        />
      </div>
      <div className="mt-3 flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="peOnly" defaultChecked={filters.peOnly} />
          Aplicar filtro adicional /PE
        </label>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900"
        >
          Filtrar
        </button>
        <Link href="/" className="text-sm text-slate-500 underline dark:text-slate-400">
          Limpar filtros
        </Link>
      </div>
    </form>
  );
}

function TextField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
      {label}
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        className="rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: [string, string][];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
      >
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function Pagination({
  page,
  totalPages,
  searchParams,
}: {
  page: number;
  totalPages: number;
  searchParams: SearchParams;
}) {
  function hrefForPage(target: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === "page" || value === undefined) continue;
      params.set(key, Array.isArray(value) ? value[0] : value);
    }
    params.set("page", String(target));
    return `/?${params.toString()}`;
  }

  return (
    <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
      <span>
        Página {page} de {totalPages}
      </span>
      <div className="flex gap-2">
        <Link
          href={hrefForPage(Math.max(1, page - 1))}
          className={`rounded-md border border-slate-300 px-3 py-1 dark:border-slate-700 ${
            page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          Anterior
        </Link>
        <Link
          href={hrefForPage(Math.min(totalPages, page + 1))}
          className={`rounded-md border border-slate-300 px-3 py-1 dark:border-slate-700 ${
            page >= totalPages
              ? "pointer-events-none opacity-40"
              : "hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          Próxima
        </Link>
      </div>
    </div>
  );
}
