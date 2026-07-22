/**
 * Geracao de arquivo .ICS (secao 17). Formato minimo compativel com
 * RFC 5545, o suficiente para importar em qualquer agenda. Nenhuma
 * integracao externa e feita aqui -- e apenas um arquivo baixado pelo
 * usuario.
 */
export type IcsEvent = {
  id: string;
  title: string;
  date: Date;
  notes?: string | null;
};

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcsText(text: string): string {
  return text.replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
}

export function buildIcsCalendar(events: IcsEvent[]): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//RPI Manager//PT-BR"];

  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@rpi-manager`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART;VALUE=DATE:${event.date.toISOString().slice(0, 10).replace(/-/g, "")}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
    );
    if (event.notes) lines.push(`DESCRIPTION:${escapeIcsText(event.notes)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
