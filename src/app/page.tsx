import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardHomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">RPI Manager</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gestão semanal da RPI — seção de Marcas
          </p>
        </div>
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
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sessão ativa
        </p>
        <p className="mt-1 font-medium">
          {session.user.name} — {session.user.email}
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Perfil: {session.user.role}
        </p>
      </section>

      <section className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Fase 1 (Fundação) concluída: autenticação, perfis e modelo de dados.
        O dashboard de publicações, importação de RPI e busca de
        JANE GLAUCIA VIEIRA como procuradora serão implementados na Fase 2,
        após a análise de um arquivo real de RPI.
      </section>
    </main>
  );
}
