import Link from "next/link";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function DashboardHomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const [totalConfirmadas, totalDuvidosas, latestEdition] = await Promise.all([
    prisma.publicationAttorney.count({ where: { matchStatus: "CONFIRMADO" } }),
    prisma.publicationAttorney.count({ where: { matchStatus: "DUVIDOSO_REVISAR" } }),
    prisma.rpiEdition.findFirst({ orderBy: { importedAt: "desc" } }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">RPI Manager</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gestão semanal da RPI — seção de Marcas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/import"
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900"
          >
            Importar RPI
          </Link>
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

      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-500 dark:text-slate-400">Sessão ativa</p>
        <p className="mt-1 font-medium">
          {session.user.name} — {session.user.email}
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Perfil: {session.user.role}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Última RPI importada" value={latestEdition?.number ?? "—"} />
        <StatCard label="Jane confirmada como procuradora" value={totalConfirmadas} />
        <StatCard label="Pendentes de revisão" value={totalDuvidosas} />
      </section>

      <section className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Fase 2 (Importação) em andamento: o parser real do relatório APOL já
        localiza JANE GLAUCIA VIEIRA como procuradora, aplica o filtro /PE e
        evita duplicidade. O dashboard completo (filtros, revisão lado a
        lado, prazos e tarefas) é a próxima etapa (Fase 3).
      </section>
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
