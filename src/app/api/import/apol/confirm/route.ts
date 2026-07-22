import { NextResponse } from "next/server";
import { requireRole, ForbiddenError } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { extractPositionedTextFromPdf } from "@/lib/parser/apol-pdf-text";
import { groupApolPdfRecords } from "@/lib/parser/apol-pdf-parser";
import { persistApolImport } from "@/lib/import/persist-apol-import";

// Parsing + persistencia (varias consultas sequenciais por publicacao) de
// uma RPI inteira pode levar mais que o limite padrao de execucao
// serverless -- sem isso, a funcao e encerrada no meio da requisicao e o
// navegador ve como falha de rede.
export const maxDuration = 60;

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export async function POST(request: Request) {
  let user;
  try {
    // "confirma importações" é atribuição do ADMINISTRADOR (seção 25).
    user = await requireRole(["ADMINISTRADOR"]);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const rpiNumber = formData.get("rpiNumber");
  const rpiDateRaw = formData.get("rpiDate");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Arquivo maior que o limite permitido (20 MB)." },
      { status: 413 },
    );
  }
  if (typeof rpiNumber !== "string" || rpiNumber.trim() === "") {
    return NextResponse.json({ error: "Informe o número da RPI." }, { status: 400 });
  }
  if (typeof rpiDateRaw !== "string" || rpiDateRaw.trim() === "") {
    return NextResponse.json(
      { error: "Informe a data de publicação da RPI (o arquivo não a declara)." },
      { status: 400 },
    );
  }

  const rpiDate = new Date(rpiDateRaw);
  if (Number.isNaN(rpiDate.getTime())) {
    return NextResponse.json({ error: "Data da RPI inválida." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const items = await extractPositionedTextFromPdf(buffer);
    const records = groupApolPdfRecords(items);

    const result = await persistApolImport(prisma, {
      records,
      rpiNumber: rpiNumber.trim(),
      rpiDate,
      fileBuffer: buffer,
      originalFilename: file.name,
      uploadedByUserId: user.id,
    });

    if (result.status === "DUPLICADO") {
      return NextResponse.json(
        {
          error: "Este arquivo já foi importado anteriormente (mesmo conteúdo).",
          existingRpiFileId: result.existingRpiFileId,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Falha ao importar o arquivo.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 422 },
    );
  }
}
