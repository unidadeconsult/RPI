import AdmZip from "adm-zip";

export type ExtractedZipEntry = {
  name: string;
  content: Buffer;
};

/**
 * Extrai entradas .xml de um ZIP (secao 28). A prioridade de extracao
 * (secao 1) exige XML antes de PDF, entao o importador deve chamar esta
 * funcao primeiro e so cair para PDF se nenhuma entrada XML for encontrada.
 */
export function extractXmlEntriesFromZip(buffer: Buffer): ExtractedZipEntry[] {
  const zip = new AdmZip(buffer);
  return zip
    .getEntries()
    .filter((entry) => !entry.isDirectory && entry.entryName.toLowerCase().endsWith(".xml"))
    .map((entry) => ({ name: entry.entryName, content: entry.getData() }));
}

export function extractPdfEntriesFromZip(buffer: Buffer): ExtractedZipEntry[] {
  const zip = new AdmZip(buffer);
  return zip
    .getEntries()
    .filter((entry) => !entry.isDirectory && entry.entryName.toLowerCase().endsWith(".pdf"))
    .map((entry) => ({ name: entry.entryName, content: entry.getData() }));
}
