import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CATEGORY_LABELS, DISPATCH_CATEGORIES } from "@/lib/dashboard/publication-filters";
import { URGENCY_LEVELS, URGENCY_LEVEL_LABELS } from "@/lib/dispatch-rules/dispatch-rule-labels";
import { upsertDispatchRule } from "./actions";

export default async function DispatchRulesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const isAdmin = session.user.role === "ADMINISTRADOR";

  const dispatchCodes = await prisma.dispatchCode.findMany({
    include: { rule: { include: { updatedBy: true } }, _count: { select: { publications: true } } },
    orderBy: { code: "asc" },
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <Link href="/" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Voltar ao dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Regras de despacho</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Tabela editável de mapeamento (seção 7) — o sistema nunca classifica um despacho por
          palavras soltas, apenas por regra aqui cadastrada e confirmada pelo administrador.
        </p>
      </header>

      {isAdmin && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-semibold">Cadastrar nova regra</h2>
          <DispatchRuleForm />
        </section>
      )}

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Descrição oficial</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Urgência</th>
              <th className="px-4 py-3">Prazo?</th>
              <th className="px-4 py-3">Publicações</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Última alteração</th>
              {isAdmin && <th className="px-4 py-3">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {dispatchCodes.map((dc) => (
              <tr key={dc.id} className="border-b border-slate-100 align-top last:border-0 dark:border-slate-800">
                <td className="px-4 py-3 font-mono">{dc.code}</td>
                <td className="px-4 py-3">{dc.officialDescription ?? "—"}</td>
                <td className="px-4 py-3">
                  {dc.rule ? CATEGORY_LABELS[dc.rule.mainCategory] : "OUTROS / NÃO CLASSIFICADO"}
                  {dc.rule?.subcategory && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{dc.rule.subcategory}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {dc.rule ? URGENCY_LEVEL_LABELS[dc.rule.urgencyLevel] : "—"}
                </td>
                <td className="px-4 py-3">{dc.rule?.hasDeadline ? "Sim" : "Não"}</td>
                <td className="px-4 py-3 tabular-nums">{dc._count.publications}</td>
                <td className="px-4 py-3">
                  {!dc.rule ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Sem regra
                    </span>
                  ) : dc.rule.active ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Ativa
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Inativa
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                  {dc.rule ? (
                    <>
                      {new Date(dc.rule.updatedAt).toLocaleDateString("pt-BR")}
                      <br />
                      {dc.rule.updatedBy?.name ?? "—"}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <details>
                      <summary className="cursor-pointer text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400">
                        Editar
                      </summary>
                      <div className="mt-2 w-80">
                        <DispatchRuleForm
                          key={dc.rule?.updatedAt.toISOString() ?? "sem-regra"}
                          code={dc.code}
                          officialDescription={dc.officialDescription}
                          rule={dc.rule}
                        />
                      </div>
                    </details>
                  </td>
                )}
              </tr>
            ))}
            {dispatchCodes.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 9 : 8} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                  Nenhum código de despacho encontrado ainda — códigos aparecem aqui automaticamente
                  após a primeira importação de uma RPI.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function DispatchRuleForm({
  code,
  officialDescription,
  rule,
}: {
  code?: string;
  officialDescription?: string | null;
  rule?: {
    mainCategory: string;
    subcategory: string | null;
    suggestedProvidence: string | null;
    urgencyLevel: string;
    hasDeadline: boolean;
    deadlineRuleDescription: string | null;
    requiredDocuments: string | null;
    active: boolean;
  } | null;
}) {
  return (
    <form action={upsertDispatchRule} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        Código do despacho
        <input
          type="text"
          name="code"
          required
          readOnly={Boolean(code)}
          defaultValue={code ?? ""}
          className="rounded-md border border-slate-300 px-2 py-1.5 font-mono text-sm dark:border-slate-700 dark:bg-slate-950"
          placeholder="ex.: I029"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        Descrição oficial (opcional)
        <input
          type="text"
          name="officialDescription"
          defaultValue={officialDescription ?? ""}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Categoria principal
        <select
          name="mainCategory"
          defaultValue={rule?.mainCategory ?? ""}
          required
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
        >
          <option value="" disabled>
            Selecione
          </option>
          {DISPATCH_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Subcategoria (opcional)
        <input
          type="text"
          name="subcategory"
          defaultValue={rule?.subcategory ?? ""}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        Providência sugerida (opcional)
        <textarea
          name="suggestedProvidence"
          rows={2}
          defaultValue={rule?.suggestedProvidence ?? ""}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Nível de urgência
        <select
          name="urgencyLevel"
          defaultValue={rule?.urgencyLevel ?? "MEDIA"}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
        >
          {URGENCY_LEVELS.map((u) => (
            <option key={u} value={u}>
              {URGENCY_LEVEL_LABELS[u]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="hasDeadline" defaultChecked={rule?.hasDeadline ?? false} />
        Normalmente gera prazo
      </label>
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        Regra de prazo (opcional, texto livre)
        <input
          type="text"
          name="deadlineRuleDescription"
          defaultValue={rule?.deadlineRuleDescription ?? ""}
          placeholder="ex.: 60 dias corridos da publicação"
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        Documentos normalmente necessários (opcional)
        <input
          type="text"
          name="requiredDocuments"
          defaultValue={rule?.requiredDocuments ?? ""}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={rule?.active ?? true} />
        Regra ativa
      </label>
      <button
        type="submit"
        className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 sm:col-span-2 dark:bg-slate-100 dark:text-slate-900"
      >
        Salvar regra
      </button>
    </form>
  );
}
