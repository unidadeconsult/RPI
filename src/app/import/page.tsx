import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ImportWorkspace } from "./import-workspace";

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.role === "CONSULTA") {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-10">
        <h1 className="text-2xl font-semibold">Importar RPI</h1>
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Seu perfil (Consulta) não tem permissão para importar edições da
          RPI. Fale com um administrador ou analista.
        </p>
      </main>
    );
  }

  const canConfirm = session.user.role === "ADMINISTRADOR";

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Importar RPI</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Envie o relatório &quot;Consulta Livre na RPI&quot; (APOL) em PDF.
          O sistema localiza as publicações em que JANE GLAUCIA VIEIRA
          aparece como procuradora antes de confirmar a importação.
        </p>
      </div>
      <ImportWorkspace canConfirm={canConfirm} />
    </main>
  );
}
