/**
 * Detector do tipo de arquivo (secao 28), por assinatura binaria com
 * fallback na extensao do nome do arquivo.
 */
export type DetectedFileType = "XML" | "ZIP" | "PDF" | "DESCONHECIDO";

export function detectFileType(buffer: Buffer, filename: string): DetectedFileType {
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07)
  ) {
    return "ZIP";
  }

  if (buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "%PDF") {
    return "PDF";
  }

  const head = buffer.subarray(0, 512).toString("utf8").trimStart();
  if (head.startsWith("<?xml") || head.startsWith("<")) {
    return "XML";
  }

  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "xml") return "XML";
  if (ext === "zip") return "ZIP";
  if (ext === "pdf") return "PDF";

  return "DESCONHECIDO";
}
