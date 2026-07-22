import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ConfirmForm } from "@/components/confirm-form";
import { createAttorneyNameAlias, toggleAttorneyNameAliasActive } from "./actions";

export default async function AttorneyNameAliasesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const isAdmin = session.user.role === "ADMINISTRADOR";

  const aliases = await prisma.attorneyNameAlias.findMany({
    include: { createdBy: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <Link href="/" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Voltar ao dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Variações do nome de JANE GLAUCIA VIEIRA</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Seção 3 — uma abreviação ou grafia alternativa (ex.: &quot;JANE G. VIEIRA&quot;) só é
          aceita como correspondência se estiver cadastrada aqui manualmente pelo administrador.
          O sistema nunca infere uma variação sozinho.
        </p>
      </header>

      {isAdmin && (
        <section className="surface-card p-6">
          <h2 className="font-semibold">Cadastrar nova variação</h2>
          <form action={createAttorneyNameAlias} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Variação do nome (grafia exatamente como aparece na RPI)
              <input
                type="text"
                name="aliasRaw"
                required
                placeholder="ex.: JANE G. VIEIRA"
                className="field"
              />
            </label>
            <button
              type="submit"
              className="btn-primary"
            >
              Cadastrar
            </button>
          </form>
        </section>
      )}

      <section className="overflow-x-auto surface-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Variação cadastrada</th>
              <th className="px-4 py-3">Forma normalizada</th>
              <th className="px-4 py-3">Cadastrada por</th>
              <th className="px-4 py-3">Status</th>
              {isAdmin && <th className="px-4 py-3">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {aliases.map((alias) => (
              <tr key={alias.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                <td className="px-4 py-3 font-medium">{alias.aliasRaw}</td>
                <td className="px-4 py-3 font-mono text-xs">{alias.aliasNormalized}</td>
                <td className="px-4 py-3">
                  {alias.createdBy?.name ?? "—"}
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(alias.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </td>
                <td className="px-4 py-3">
                  {alias.active ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Ativa
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Inativa
                    </span>
                  )}
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    {alias.active ? (
                      <ConfirmForm
                        action={toggleAttorneyNameAliasActive}
                        confirmMessage={`Desativar a variação "${alias.aliasRaw}"? Publicações futuras com essa grafia deixarão de ser aceitas automaticamente.`}
                      >
                        <input type="hidden" name="id" value={alias.id} />
                        <button type="submit" className="text-xs text-blue-600 underline hover:text-blue-800 dark:text-blue-400">
                          Desativar
                        </button>
                      </ConfirmForm>
                    ) : (
                      <form action={toggleAttorneyNameAliasActive}>
                        <input type="hidden" name="id" value={alias.id} />
                        <button type="submit" className="text-xs text-blue-600 underline hover:text-blue-800 dark:text-blue-400">
                          Ativar
                        </button>
                      </form>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {aliases.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                  Nenhuma variação cadastrada ainda. Sem cadastro, apenas &quot;JANE GLAUCIA VIEIRA&quot;
                  (com ou sem acentos/espaços duplicados) é reconhecida.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
