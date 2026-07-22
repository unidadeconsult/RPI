import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { parseNaturalLanguageQuery, buildSearchQueryString } from "@/lib/search/natural-language-query";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { q } = await searchParams;
  const result = q && q.trim() !== "" ? parseNaturalLanguageQuery(q) : null;
  const dashboardHref = result ? `/?${buildSearchQueryString(result.filters)}` : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <Link href="/" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Voltar ao dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Pesquisa em linguagem natural</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Descreva o que procura em português — ex.: &quot;oposições em Pernambuco não revisadas&quot; ou
          &quot;marca &quot;ACME&quot; RPI 2888&quot;. O reconhecimento é feito localmente por palavras-chave,
          sem enviar nada a serviços externos de IA.
        </p>
      </header>

      <form method="get" className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder='Ex.: oposições em Pernambuco não revisadas'
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
        />
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900"
        >
          Pesquisar
        </button>
      </form>

      {result && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-semibold">Entendemos sua busca como:</h2>
          {result.recognized.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {result.recognized.map((r, i) => (
                <li
                  key={i}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <span className="font-medium">{r.label}:</span> {r.value}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Nenhum filtro reconhecido nesta busca — os resultados mostrarão todas as publicações.
            </p>
          )}

          {result.leftoverText && (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
              Trecho não reconhecido (ignorado nos filtros): &quot;{result.leftoverText}&quot;
            </p>
          )}

          <Link
            href={dashboardHref!}
            className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900"
          >
            Ver resultados no dashboard
          </Link>
        </section>
      )}
    </main>
  );
}
