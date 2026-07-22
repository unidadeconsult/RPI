import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { buildWeeklyReportData } from "@/lib/reports/weekly-report";
import { CATEGORY_LABELS } from "@/lib/dashboard/publication-filters";

export async function GET(request: Request) {
  await requireUser();

  const { searchParams } = new URL(request.url);
  const rpiEditionId = searchParams.get("rpiEditionId");
  if (!rpiEditionId) {
    return NextResponse.json({ error: "Informe rpiEditionId." }, { status: 400 });
  }

  const report = await buildWeeklyReportData(prisma, rpiEditionId);

  const workbook = new ExcelJS.Workbook();
  const summarySheet = workbook.addWorksheet("Resumo");
  summarySheet.columns = [
    { header: "Indicador", key: "label", width: 45 },
    { header: "Valor", key: "value", width: 15 },
  ];
  summarySheet.addRows([
    { label: `RPI nº ${report.rpiNumber}`, value: report.rpiDate.toLocaleDateString("pt-BR") },
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
  ]);
  summarySheet.getRow(1).font = { bold: true };

  const categorySheet = workbook.addWorksheet("Por categoria");
  categorySheet.columns = [
    { header: "Categoria", key: "category", width: 30 },
    { header: "Quantidade", key: "count", width: 15 },
  ];
  categorySheet.addRows(
    report.categoryCounts.map((c) => ({ category: CATEGORY_LABELS[c.category], count: c.count })),
  );
  categorySheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer as unknown as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="relatorio-rpi-${report.rpiNumber}.xlsx"`,
    },
  });
}
