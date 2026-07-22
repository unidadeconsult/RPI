import { describe, expect, it } from "vitest";
import { buildIcsCalendar } from "./ics-export";

describe("buildIcsCalendar", () => {
  it("gera cabecalho e rodape validos", () => {
    const ics = buildIcsCalendar([]);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("inclui um VEVENT por evento com titulo e data", () => {
    const ics = buildIcsCalendar([
      { id: "abc123", title: "Prazo para recurso", date: new Date("2026-09-19T00:00:00Z") },
    ]);
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("SUMMARY:Prazo para recurso");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260919");
    expect(ics).toContain("UID:abc123@rpi-manager");
  });

  it("escapa virgulas no titulo", () => {
    const ics = buildIcsCalendar([
      { id: "1", title: "Reunião, cliente A", date: new Date("2026-01-01T00:00:00Z") },
    ]);
    expect(ics).toContain("SUMMARY:Reunião\\, cliente A");
  });
});
