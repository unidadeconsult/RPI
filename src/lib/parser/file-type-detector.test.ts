import { describe, expect, it } from "vitest";
import { detectFileType } from "./file-type-detector";

describe("detectFileType", () => {
  it("detecta XML pela assinatura", () => {
    const buffer = Buffer.from('<?xml version="1.0"?><root></root>');
    expect(detectFileType(buffer, "arquivo.xml")).toBe("XML");
  });

  it("detecta ZIP pelos magic bytes", () => {
    const buffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
    expect(detectFileType(buffer, "arquivo.zip")).toBe("ZIP");
  });

  it("detecta PDF pelos magic bytes", () => {
    const buffer = Buffer.from("%PDF-1.7\n%...");
    expect(detectFileType(buffer, "arquivo.pdf")).toBe("PDF");
  });

  it("usa a extensao como fallback quando o conteudo e ambiguo", () => {
    const buffer = Buffer.from("");
    expect(detectFileType(buffer, "arquivo.xml")).toBe("XML");
  });

  it("retorna DESCONHECIDO para conteudo e extensao nao reconhecidos", () => {
    const buffer = Buffer.from([0x00, 0x01, 0x02]);
    expect(detectFileType(buffer, "arquivo.bin")).toBe("DESCONHECIDO");
  });
});
