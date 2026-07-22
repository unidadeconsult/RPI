import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const LOCAL_STORAGE_ROOT = path.resolve(process.cwd(), "storage");

/**
 * Abstracao minima de armazenamento de arquivos. Em desenvolvimento (sem
 * BLOB_READ_WRITE_TOKEN configurado) grava em disco local, como sempre
 * funcionou. Em producao na Vercel -- onde o sistema de arquivos e
 * efemero e nao pode ser usado para persistir uploads -- grava no Vercel
 * Blob. O valor retornado (caminho local ou URL) e o mesmo que ja era
 * gravado em filePath/storagePath no banco, entao nao exige migracao de
 * schema.
 */
export async function saveFile(folder: string, filename: string, buffer: Buffer): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`${folder}/${filename}`, buffer, {
      access: "public",
      addRandomSuffix: false,
    });
    return blob.url;
  }

  const folderPath = path.join(LOCAL_STORAGE_ROOT, folder);
  await mkdir(folderPath, { recursive: true });
  const filePath = path.join(folderPath, filename);
  await writeFile(filePath, buffer);
  return filePath;
}

export async function loadFile(reference: string): Promise<Buffer> {
  if (reference.startsWith("http://") || reference.startsWith("https://")) {
    const response = await fetch(reference);
    if (!response.ok) {
      throw new Error("Arquivo não encontrado no armazenamento.");
    }
    return Buffer.from(await response.arrayBuffer());
  }

  return readFile(reference);
}
