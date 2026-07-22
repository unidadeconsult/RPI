import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CATEGORY_LABELS } from "@/lib/dashboard/publication-filters";
import { buildEmailText, buildWeeklyReportData, buildWhatsAppSummary } from "@/lib/reports/weekly-report";
import { EditionSelect, PrintButton } from "./report-controls";

export default async function WeeklyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ rpiEditionId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { rpiEditionId } = await searchParams;

  const editions = await prisma.rpiEdition.findMany({
    orderBy: [{ publicationDate: "desc" }, { versionLabel: "desc" }],
    select: { id: true, number: true, publicationDate: true, versionLabel: true },
  });

  if (editions.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
        <Link href="/" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Voltar ao dashboard
        </Link>
        <h1 className="text-2xl font-semibold">Relatório semanal</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Nenhuma edição da RPI foi importada ainda. Importe uma edição para gerar o relatório.
        </p>
      </main>
    );
  }

  const selectedEditionId = rpiEditionId ?? editions[0].id;
  const report = await buildWeeklyReportData(prisma, selectedEditionId);
  const whatsapp = buildWhatsAppSummary(report);
  const email = buildEmailText(report);

  const statCards: { label: string; value: number }[] = [
    { label: "Total de ocorrências (Jane como procuradora)", value: report.totalOcorrencias },
    { label: "Confirmadas", value: report.totalConfirmadas },
    { label: "Vínculo não confirmado (revisar)", value: report.totalDuvidosas },
    { label: "Processos novos", value: report.processosNovos },
    { label: "Mudanças de situação", value: report.mudancasDeSituacao },
    { label: "Prazos urgentes (7 dias)", value: report.prazosUrgentes },
    { label: "Tarefas criadas", value: report.tarefasCriadas },
    { label: "Pendentes de revisão", value: report.pendentesRevisao },
    { label: "Códigos de despacho desconhecidos", value: report.codigosDesconhecidos },
    { label: "Processos fora da carteira", value: report.processosForaDaCarteira },
    { label: "Marcas semelhantes relevantes", value: report.marcasSemelhantesEncontradas },
    { label: "Processos sem documento anexado", value: report.documentosPendentes },
  ];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10 print:max-w-none print:px-0 print:py-0">
      <div className="print:hidden">
        <Link href="/" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Voltar ao dashboard
        </Link>
      </div>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Relatório semanal</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            RPI nº {report.rpiNumber} — {report.rpiDate.toLocaleDateString("pt-BR")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <EditionSelect editions={editions} selectedEditionId={selectedEditionId} />
          <a
            href={`/api/reports/weekly/pdf?rpiEditionId=${selectedEditionId}`}
            className="btn-secondary"
          >
            Baixar PDF
          </a>
          <a
            href={`/api/reports/weekly/excel?rpiEditionId=${selectedEditionId}`}
            className="btn-secondary"
          >
            Baixar Excel
          </a>
          <PrintButton />
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="surface-card p-4"
          >
            <p className="text-2xl font-semibold">{card.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{card.label}</p>
          </div>
        ))}
      </section>

      <section className="overflow-x-auto surface-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Categoria de despacho</th>
              <th className="px-4 py-3">Quantidade</th>
            </tr>
          </thead>
          <tbody>
            {report.categoryCounts.map((c) => (
              <tr key={c.category} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                <td className="px-4 py-3">{CATEGORY_LABELS[c.category]}</td>
                <td className="px-4 py-3">{c.count}</td>
              </tr>
            ))}
            {report.categoryCounts.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                  Nenhuma publicação nesta edição.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="grid grid-cols-1 gap-4 print:hidden lg:grid-cols-2">
        <div className="surface-card p-4">
          <h2 className="font-semibold">Resumo para WhatsApp</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Copie e cole manualmente — nada é enviado automaticamente.</p>
          <textarea
            readOnly
            value={whatsapp}
            className="mt-3 h-40 w-full resize-none field"
          />
        </div>
        <div className="surface-card p-4">
          <h2 className="font-semibold">Texto para e-mail</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Copie e cole manualmente — nada é enviado automaticamente.</p>
          <textarea
            readOnly
            value={email}
            className="mt-3 h-40 w-full resize-none field"
          />
        </div>
      </section>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Esta é uma ferramenta de apoio operacional e não substitui a análise jurídica profissional.
      </p>
    </main>
  );
}
