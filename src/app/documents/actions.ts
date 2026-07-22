"use server";

import { createHash } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import type { DocumentType } from "@/generated/prisma/client";

const STORAGE_ROOT = path.resolve(process.cwd(), "storage", "documents");

function textOrNull(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/**
 * Envia um documento (secao 18). Se `existingDocumentId` for informado,
 * cria uma NOVA VERSAO em vez de substituir o arquivo anterior --
 * nenhum documento e sobrescrito silenciosamente, o historico de
 * versoes e sempre preservado.
 */
export async function uploadDocument(formData: FormData) {
  const user = await requireRole(["ADMINISTRADOR", "ANALISTA"]);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Selecione um arquivo.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileHash = createHash("sha256").update(buffer).digest("hex");

  await mkdir(STORAGE_ROOT, { recursive: true });
  const storedFilename = `${fileHash}-${file.name}`;
  const storagePath = path.join(STORAGE_ROOT, storedFilename);
  await writeFile(storagePath, buffer);

  const existingDocumentId = textOrNull(formData.get("existingDocumentId"));

  if (existingDocumentId) {
    const existing = await prisma.document.findUniqueOrThrow({
      where: { id: existingDocumentId },
    });
    const newVersionNumber = existing.currentVersion + 1;

    await prisma.$transaction([
      prisma.document.update({
        where: { id: existingDocumentId },
        data: { currentVersion: newVersionNumber, filePath: storagePath, fileHash },
      }),
      prisma.documentVersion.create({
        data: {
          documentId: existingDocumentId,
          versionNumber: newVersionNumber,
          filePath: storagePath,
          fileHash,
          changeNote: textOrNull(formData.get("changeNote")),
          uploadedById: user.id,
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "UPLOAD_DOCUMENT_VERSION",
          entityType: "Document",
          entityId: existingDocumentId,
          newValue: { versionNumber: newVersionNumber, fileHash },
        },
      }),
    ]);

    revalidatePath(`/documents/${existingDocumentId}`);
    redirect(`/documents/${existingDocumentId}`);
  }

  const name = formData.get("name");
  const typeRaw = formData.get("type");
  if (typeof name !== "string" || name.trim() === "") {
    throw new Error("Nome do documento é obrigatório.");
  }

  const processNumber = textOrNull(formData.get("processNumber"));
  let proceedingId: string | null = null;
  if (processNumber) {
    const proceeding = await prisma.proceeding.findUnique({ where: { processNumber } });
    proceedingId = proceeding?.id ?? null;
  }

  const document = await prisma.document.create({
    data: {
      name: name.trim(),
      type: typeRaw as DocumentType,
      proceedingId,
      clientId: textOrNull(formData.get("clientId")),
      taskId: textOrNull(formData.get("taskId")),
      description: textOrNull(formData.get("description")),
      origin: textOrNull(formData.get("origin")),
      filePath: storagePath,
      fileHash,
      uploadedById: user.id,
    },
  });

  await prisma.$transaction([
    prisma.documentVersion.create({
      data: {
        documentId: document.id,
        versionNumber: 1,
        filePath: storagePath,
        fileHash,
        uploadedById: user.id,
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPLOAD_DOCUMENT",
        entityType: "Document",
        entityId: document.id,
        newValue: { name: document.name, type: document.type },
      },
    }),
  ]);

  revalidatePath("/documents");
  redirect(`/documents/${document.id}`);
}
