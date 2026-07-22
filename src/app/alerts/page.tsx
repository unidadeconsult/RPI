import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildInconsistencyAlerts, type AlertSeverity } from "@/lib/alerts/inconsistency-checks";

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  ALTA: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  MEDIA: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  BAIXA: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  ALTA: "Alta",
  MEDIA: "Média",
  BAIXA: "Baixa",
};

export default async function AlertsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const alerts = await buildInconsistencyAlerts(prisma);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <Link href="/" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Voltar ao dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Alertas de inconsistência</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Lacunas de cadastro ou de processo detectadas a partir de regras objetivas — não são conclusões jurídicas.
        </p>
      </header>

      {alerts.length === 0 ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          Nenhuma inconsistência detectada no momento.
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="surface-card p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLES[alert.severity]}`}>
                    {SEVERITY_LABELS[alert.severity]}
                  </span>
                  <h2 className="font-semibold">{alert.title}</h2>
                </div>
                <span className="text-lg font-semibold tabular-nums">{alert.count}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{alert.description}</p>
              {alert.href && (
                <Link
                  href={alert.href}
                  className="mt-2 inline-block text-sm text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
                >
                  Ver registros
                </Link>
              )}
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
