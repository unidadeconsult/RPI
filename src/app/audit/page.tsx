import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS, buildAuditEntityHref, describeAuditAction } from "@/lib/audit/audit-labels";

const PAGE_SIZE = 50;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entityType?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMINISTRADOR") redirect("/");

  const { action, entityType, page: pageRaw } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageRaw ?? "1", 10) || 1);

  const where = {
    ...(action ? { action } : {}),
    ...(entityType ? { entityType } : {}),
  };

  const [total, entityTypes, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true }, orderBy: { entityType: "asc" } }),
    prisma.auditLog.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <Link href="/" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Voltar ao dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Trilha de auditoria</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Registro completo de ações relevantes no sistema — visível apenas para administradores.
        </p>
      </header>

      <form method="get" className="flex flex-wrap items-end gap-3 surface-card p-4">
        <label className="flex flex-col gap-1 text-sm">
          Ação
          <select
            name="action"
            defaultValue={action ?? ""}
            className="field"
          >
            <option value="">Todas</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {describeAuditAction(a)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Tipo de registro
          <select
            name="entityType"
            defaultValue={entityType ?? ""}
            className="field"
          >
            <option value="">Todos</option>
            {entityTypes.map((e) => (
              <option key={e.entityType} value={e.entityType}>
                {e.entityType}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="btn-primary"
        >
          Filtrar
        </button>
      </form>

      <section className="overflow-x-auto surface-card">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Data/hora</th>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Ação</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Registro</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const href = buildAuditEntityHref(log.entityType, log.entityId);
              return (
                <tr key={log.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">{log.user?.name ?? "sistema"}</td>
                  <td className="px-4 py-3">{describeAuditAction(log.action)}</td>
                  <td className="px-4 py-3">{log.entityType}</td>
                  <td className="px-4 py-3">
                    {href ? (
                      <Link href={href} className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400">
                        Ver registro
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                  Nenhum registro de auditoria encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-3 text-sm">
          {page > 1 && (
            <Link
              href={`/audit?${new URLSearchParams({ ...(action ? { action } : {}), ...(entityType ? { entityType } : {}), page: String(page - 1) }).toString()}`}
              className="btn-secondary"
            >
              ← Anterior
            </Link>
          )}
          <span className="text-slate-500 dark:text-slate-400">
            Página {page} de {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/audit?${new URLSearchParams({ ...(action ? { action } : {}), ...(entityType ? { entityType } : {}), page: String(page + 1) }).toString()}`}
              className="btn-secondary"
            >
              Próxima →
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
