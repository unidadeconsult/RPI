import type { TaskPriority, TaskStatus } from "@/generated/prisma/client";

export const TASK_STATUSES: TaskStatus[] = [
  "NOVO",
  "EM_CONFERENCIA",
  "PROVIDENCIA_DEFINIDA",
  "AGUARDANDO_CLIENTE",
  "EM_EXECUCAO",
  "AGUARDANDO_PAGAMENTO",
  "PROTOCOLADO",
  "CONCLUIDO",
  "SEM_PROVIDENCIA",
  "CANCELADO",
];

export const TASK_PRIORITIES: TaskPriority[] = ["BAIXA", "MEDIA", "ALTA", "URGENTE"];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  NOVO: "Novo",
  EM_CONFERENCIA: "Em conferência",
  PROVIDENCIA_DEFINIDA: "Providência definida",
  AGUARDANDO_CLIENTE: "Aguardando cliente",
  EM_EXECUCAO: "Em execução",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PROTOCOLADO: "Protocolado",
  CONCLUIDO: "Concluído",
  SEM_PROVIDENCIA: "Sem providência",
  CANCELADO: "Cancelado",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  URGENTE: "Urgente",
};
