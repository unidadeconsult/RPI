import { describe, expect, it } from "vitest";
import AdmZip from "adm-zip";
import { extractPdfEntriesFromZip, extractXmlEntriesFromZip } from "./zip-extractor";

describe("extractXmlEntriesFromZip", () => {
  it("extrai entradas .xml de um zip", () => {
    const zip = new AdmZip();
    zip.addFile("rpi2800.xml", Buffer.from("<root></root>"));
    zip.addFile("leia-me.txt", Buffer.from("nao e xml"));
    const buffer = zip.toBuffer();

    const entries = extractXmlEntriesFromZip(buffer);
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe("rpi2800.xml");
    expect(entries[0].content.toString("utf8")).toBe("<root></root>");
  });

  it("retorna lista vazia quando nao ha xml no zip", () => {
    const zip = new AdmZip();
    zip.addFile("leia-me.txt", Buffer.from("nao e xml"));
    const buffer = zip.toBuffer();

    expect(extractXmlEntriesFromZip(buffer)).toHaveLength(0);
  });
});

describe("extractPdfEntriesFromZip", () => {
  it("extrai entradas .pdf de um zip", () => {
    const zip = new AdmZip();
    zip.addFile("rpi2800.pdf", Buffer.from("%PDF-1.7"));
    const buffer = zip.toBuffer();

    const entries = extractPdfEntriesFromZip(buffer);
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe("rpi2800.pdf");
  });
});
