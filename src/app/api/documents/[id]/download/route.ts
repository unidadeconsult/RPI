import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

/**
 * Download autenticado de documento (secao 18/25): nunca exposto
 * publicamente, exige sessao valida. Aceita ?version=N para baixar uma
 * versao especifica; sem o parametro, baixa a versao atual.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser();

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const versionParam = searchParams.get("version");

  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) {
    return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
  }

  let filePath = document.filePath;
  if (versionParam) {
    const version = await prisma.documentVersion.findFirst({
      where: { documentId: id, versionNumber: Number.parseInt(versionParam, 10) },
    });
    if (!version) {
      return NextResponse.json({ error: "Versão não encontrada." }, { status: 404 });
    }
    filePath = version.filePath;
  }

  try {
    const buffer = await readFile(filePath);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${document.name}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo não encontrado no armazenamento." }, { status: 404 });
  }
}
