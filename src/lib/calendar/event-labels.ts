import type { CalendarEventType } from "@/generated/prisma/client";

export const EVENT_TYPES: CalendarEventType[] = [
  "PRAZO",
  "TAREFA",
  "PAGAMENTO",
  "REUNIAO",
  "SOLICITACAO_CLIENTE",
  "MANIFESTACAO",
  "RECURSO",
  "EXIGENCIA",
  "RENOVACAO",
  "INTERNO",
];

export const EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  PRAZO: "Prazo",
  TAREFA: "Tarefa",
  PAGAMENTO: "Pagamento",
  REUNIAO: "Reunião",
  SOLICITACAO_CLIENTE: "Solicitação ao cliente",
  MANIFESTACAO: "Manifestação",
  RECURSO: "Recurso",
  EXIGENCIA: "Exigência",
  RENOVACAO: "Renovação",
  INTERNO: "Data interna",
};
