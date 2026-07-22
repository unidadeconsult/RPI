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
import { AnimatedNumber } from "@/components/animated-number";
import { IconAlert, IconBriefcaseOff, IconCalendarCheck, IconClock, IconEdition, IconEye, IconStack } from "@/components/icons";
import { CATEGORICAL_PALETTE } from "@/app/management/palette";
import type { DispatchCategory } from "@/generated/prisma/client";

type SearchParams = { [key: string]: string | string[] | undefined };

const NAV_LINKS = [
  { href: "/search", label: "Pesquisa" },
  { href: "/dispatch-rules", label: "Regras de despacho" },
  { href: "/attorney-name-aliases", label: "Variações do nome" },
  { href: "/clients", label: "Clientes" },
  { href: "/tasks", label: "Tarefas" },
  { href: "/deadlines", label: "Prazos" },
  { href: "/calendar", label: "Calendário" },
  { href: "/documents", label: "Documentos" },
  { href: "/messages", label: "Mensagens" },
  { href: "/reports/weekly", label: "Relatórios" },
  { href: "/management", label: "Painel gerencial" },
  { href: "/similarity-matches", label: "Marcas semelhantes" },
  { href: "/monitored-trademarks", label: "Monitorar marcas" },
  { href: "/alerts", label: "Alertas" },
];

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
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-7 px-6 py-10">
      <header className="enter flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            RPI
          </div>
          <div>
            <h1 className="text-2xl font-semibold">RPI Manager</h1>
            <p className="text-sm" style={{ color: "var(--ink-secondary)" }}>
              Publicações em que JANE GLAUCIA VIEIRA aparece como procuradora
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: "var(--ink-secondary)" }}>
              {session!.user.name} · {session!.user.role}
            </span>
            <Link href="/import" className="btn-primary">
              Importar RPI
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button type="submit" className="btn-secondary">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <nav className="enter enter-delay-1 flex flex-wrap gap-x-5 gap-y-2 border-y py-3" style={{ borderColor: "var(--border)" }}>
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="link-nav">
            {link.label}
          </Link>
        ))}
        {session!.user.role === "ADMINISTRADOR" && (
          <Link href="/audit" className="link-nav">
            Auditoria
          </Link>
        )}
      </nav>

      <section className="enter enter-delay-1 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={<IconEdition />} label="Última RPI importada" value={latestEdition ? latestEdition.number : "—"} />
        <StatCard
          icon={<IconCalendarCheck />}
          label="Data da última importação"
          value={latestEdition ? new Date(latestEdition.importedAt).toLocaleDateString("pt-BR") : "—"}
        />
        <StatCard icon={<IconStack />} label="Total de publicações" value={totalPublications} />
        <StatCard icon={<IconEye />} label="Pendentes de revisão" value={totalNaoRevisado} tone={totalNaoRevisado > 0 ? "warn" : undefined} />
        <StatCard
          icon={<IconBriefcaseOff />}
          label="Processos fora da carteira"
          value={Math.max(0, totalProcessosForaDaCarteira)}
          tone={totalProcessosForaDaCarteira > 0 ? "warn" : undefined}
        />
        <StatCard icon={<IconClock />} label="Prazos urgentes (7 dias)" value={prazosUrgentes} tone={prazosUrgentes > 0 ? "critical" : undefined} />
        <StatCard icon={<IconAlert />} label="Tarefas atrasadas" value={tarefasAtrasadas} tone={tarefasAtrasadas > 0 ? "critical" : undefined} />
      </section>

      <section className="enter enter-delay-2 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {DISPATCH_CATEGORIES.map((category, index) => (
          <CategoryCard
            key={category}
            category={category}
            color={CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length]}
            count={categoryCountMap.get(category) ?? 0}
            active={filters.category === category}
          />
        ))}
      </section>

      <div className="enter enter-delay-2">
        <FilterForm filters={filters} />
      </div>

      <section className="enter enter-delay-3 surface-card overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="text-xs uppercase" style={{ color: "var(--ink-muted)", borderBottom: "1px solid var(--border)" }}>
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
                <tr key={pub.id} className="align-top" style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-4 py-3">
                    <span className="badge badge-neutral">{CATEGORY_LABELS[pub.category]}</span>
                    {pub.categoryIsUnknownCode && (
                      <p className="mt-1 text-xs" style={{ color: "var(--warn)" }}>
                        código não classificado
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">{pub.dispatchCode?.code ?? "—"}</td>
                  <td className="px-4 py-3">
                    {pub.proceedingId ? (
                      <Link href={`/proceedings/${pub.proceedingId}`} className="font-medium underline" style={{ color: "var(--accent)" }}>
                        {pub.processNumberRaw ?? "—"}
                      </Link>
                    ) : (
                      (pub.processNumberRaw ?? "—")
                    )}
                  </td>
                  <td className="px-4 py-3">{trademark?.name ?? "—"}</td>
                  <td className="px-4 py-3">{pub.parties.map((party) => party.name).join(" / ") || "—"}</td>
                  <td className="px-4 py-3">{niceClasses || "—"}</td>
                  <td className="px-4 py-3">
                    <PeBadge status={pub.peStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <ConfidenceBadge level={pub.confidenceLevel} />
                    {attorney?.matchStatus === "DUVIDOSO_REVISAR" && (
                      <p className="mt-1 text-xs" style={{ color: "var(--warn)" }}>
                        vínculo não confirmado — revisar
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="font-medium"
                      style={{ color: pub.reviewStatus === "REVISADO" ? "var(--good)" : "var(--ink-muted)" }}
                    >
                      {pub.reviewStatus === "REVISADO" ? "Revisado" : "Não revisado"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2">
                      <Link href={`/publications/${pub.id}`} className="text-xs font-semibold underline" style={{ color: "var(--accent)" }}>
                        Abrir detalhes
                      </Link>
                      <details>
                        <summary className="cursor-pointer text-xs" style={{ color: "var(--ink-muted)" }}>
                          Ver trecho original
                        </summary>
                        <pre
                          className="mt-2 max-w-xs whitespace-pre-wrap rounded-md p-2 text-xs"
                          style={{ background: "var(--bg-subtle)" }}
                        >
                          {pub.sourceExcerpt}
                        </pre>
                      </details>
                      {canReview && (
                        <form action={toggleReviewStatus}>
                          <input type="hidden" name="publicationId" value={pub.id} />
                          <button type="submit" className="text-xs font-medium underline" style={{ color: "var(--ink-secondary)" }}>
                            {pub.reviewStatus === "REVISADO" ? "Marcar como não revisado" : "Marcar como revisado"}
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
                <td colSpan={10} className="px-4 py-10 text-center" style={{ color: "var(--ink-muted)" }}>
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

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone?: "warn" | "critical";
}) {
  const toneColor = tone === "critical" ? "var(--critical)" : tone === "warn" ? "var(--warn)" : "var(--accent)";
  const toneSoft = tone === "critical" ? "var(--critical-soft)" : tone === "warn" ? "var(--warn-soft)" : "var(--accent-soft)";

  return (
    <div className="surface-card flex flex-col gap-3 p-4">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ background: toneSoft, color: toneColor }}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-semibold tabular-nums">
          {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
        </p>
        <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
          {label}
        </p>
      </div>
    </div>
  );
}

function CategoryCard({
  category,
  color,
  count,
  active,
}: {
  category: DispatchCategory;
  color: string;
  count: number;
  active: boolean;
}) {
  return (
    <Link
      href={active ? "/" : `/?category=${category}`}
      className="surface-card-interactive block p-3 text-sm"
      style={{
        borderTop: `3px solid ${color}`,
        background: active ? "var(--accent-soft)" : "var(--surface)",
        borderColor: active ? "var(--accent-soft-border)" : undefined,
      }}
    >
      <p className="text-xs" style={{ color: "var(--ink-secondary)" }}>
        {CATEGORY_LABELS[category]}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums" style={{ color: active ? "var(--accent)" : "var(--ink)" }}>
        {count}
      </p>
    </Link>
  );
}

function PeBadge({ status }: { status: string }) {
  if (status === "CONFIRMADO_PE") return <span className="badge badge-good">PE</span>;
  if (status === "NAO_CONFIRMADO_REVISAR") return <span className="badge badge-warn">revisar</span>;
  return <span style={{ color: "var(--ink-muted)" }}>—</span>;
}

function ConfidenceBadge({ level }: { level: string }) {
  const cls: Record<string, string> = {
    ALTA: "badge badge-good",
    MEDIA: "badge badge-accent",
    BAIXA: "badge badge-critical",
  };
  return <span className={cls[level] ?? "badge badge-neutral"}>{level}</span>;
}

function FilterForm({ filters }: { filters: ReturnType<typeof parsePublicationFilters> }) {
  return (
    <form className="surface-card p-4">
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
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ink-secondary)" }}>
          <input type="checkbox" name="peOnly" defaultChecked={filters.peOnly} />
          Aplicar filtro adicional /PE
        </label>
        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ink-secondary)" }}>
          <input type="checkbox" name="semCliente" defaultChecked={filters.semCliente} />
          Somente processos fora da carteira
        </label>
        <button type="submit" className="btn-primary">
          Filtrar
        </button>
        <Link href="/" className="text-sm underline" style={{ color: "var(--ink-muted)" }}>
          Limpar filtros
        </Link>
      </div>
    </form>
  );
}

function TextField({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--ink-secondary)" }}>
      {label}
      <input type="text" name={name} defaultValue={defaultValue} className="field" />
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
    <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--ink-secondary)" }}>
      {label}
      <select name={name} defaultValue={defaultValue} className="field">
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
    <div className="flex items-center justify-between text-sm" style={{ color: "var(--ink-muted)" }}>
      <span>
        Página {page} de {totalPages}
      </span>
      <div className="flex gap-2">
        <Link href={hrefForPage(Math.max(1, page - 1))} className={`btn-secondary ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}>
          Anterior
        </Link>
        <Link
          href={hrefForPage(Math.min(totalPages, page + 1))}
          className={`btn-secondary ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}
        >
          Próxima
        </Link>
      </div>
    </div>
  );
}
