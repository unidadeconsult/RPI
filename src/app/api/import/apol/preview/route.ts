import { NextResponse } from "next/server";
import { requireRole, ForbiddenError } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { buildApolPreview } from "@/lib/import/apol-preview";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    await requireRole(["ADMINISTRADOR", "ANALISTA"]);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Arquivo maior que o limite permitido (20 MB)." },
      { status: 413 },
    );
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json(
      {
        error:
          "Por enquanto apenas o relatório PDF do APOL é suportado (XML/ZIP oficiais aguardam análise de um arquivo real).",
      },
      { status: 422 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const preview = await buildApolPreview(prisma, buffer);
    return NextResponse.json({
      fileName: file.name,
      fileSizeBytes: file.size,
      ...preview,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          "Não foi possível ler o PDF. Verifique se o arquivo não está corrompido ou se é uma versão escaneada sem texto pesquisável (OCR ainda não implementado).",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 422 },
    );
  }
}
