import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
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

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([595, 842]); // A4
  let y = 800;

  const drawLine = (text: string, options?: { size?: number; useBold?: boolean; gap?: number }) => {
    const size = options?.size ?? 11;
    page.drawText(text, {
      x: 50,
      y,
      size,
      font: options?.useBold ? bold : font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= options?.gap ?? size + 8;
  };

  drawLine("Relatório Semanal — RPI Manager", { size: 18, useBold: true, gap: 28 });
  drawLine(`RPI nº ${report.rpiNumber} — ${report.rpiDate.toLocaleDateString("pt-BR")}`, {
    size: 13,
    useBold: true,
    gap: 24,
  });

  drawLine(
    `Jane Glaucia Vieira como procuradora: ${report.totalOcorrencias} publicações (${report.totalConfirmadas} confirmadas, ${report.totalDuvidosas} para revisar)`,
  );
  drawLine(`Processos novos: ${report.processosNovos}`);
  drawLine(`Mudanças de situação: ${report.mudancasDeSituacao}`);
  drawLine(`Prazos urgentes (7 dias): ${report.prazosUrgentes}`);
  drawLine(`Tarefas criadas: ${report.tarefasCriadas}`);
  drawLine(`Pendentes de revisão: ${report.pendentesRevisao}`);
  drawLine(`Códigos de despacho desconhecidos: ${report.codigosDesconhecidos}`);
  drawLine(`Processos fora da carteira: ${report.processosForaDaCarteira}`);
  drawLine(`Marcas semelhantes relevantes: ${report.marcasSemelhantesEncontradas}`);
  drawLine(`Processos sem documento anexado: ${report.documentosPendentes}`, { gap: 24 });

  drawLine("Por categoria de despacho:", { useBold: true, gap: 18 });
  for (const c of report.categoryCounts) {
    drawLine(`- ${CATEGORY_LABELS[c.category]}: ${c.count}`);
  }

  y -= 16;
  drawLine(
    "Esta é uma ferramenta de apoio operacional e não substitui a análise jurídica profissional.",
    { size: 9 },
  );

  const bytes = await pdfDoc.save();

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-rpi-${report.rpiNumber}.pdf"`,
    },
  });
}
