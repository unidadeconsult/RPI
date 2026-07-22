import type { MessageChannel, MessageDraftStatus, MessageTemplateCategory } from "@/generated/prisma/client";

export const MESSAGE_CHANNELS: MessageChannel[] = ["WHATSAPP", "EMAIL", "INTERNO"];

export const MESSAGE_CHANNEL_LABELS: Record<MessageChannel, string> = {
  WHATSAPP: "WhatsApp",
  EMAIL: "E-mail",
  INTERNO: "Mensagem interna",
};

export const MESSAGE_CATEGORIES: MessageTemplateCategory[] = [
  "COMUNICACAO_PUBLICACAO",
  "COMUNICACAO_OPOSICAO",
  "COMUNICACAO_DEFERIMENTO",
  "COBRANCA_PAGAMENTO",
  "PEDIDO_DOCUMENTOS",
  "PEDIDO_PROVAS_USO",
  "COMUNICACAO_INDEFERIMENTO",
  "ACOMPANHAMENTO_PRAZO",
  "LEMBRETE_INTERNO",
  "CONCLUSAO_PROCEDIMENTO",
];

export const MESSAGE_CATEGORY_LABELS: Record<MessageTemplateCategory, string> = {
  COMUNICACAO_PUBLICACAO: "Comunicação de publicação",
  COMUNICACAO_OPOSICAO: "Comunicação de oposição",
  COMUNICACAO_DEFERIMENTO: "Comunicação de deferimento",
  COBRANCA_PAGAMENTO: "Cobrança de pagamento",
  PEDIDO_DOCUMENTOS: "Pedido de documentos",
  PEDIDO_PROVAS_USO: "Pedido de provas de uso",
  COMUNICACAO_INDEFERIMENTO: "Comunicação de indeferimento",
  ACOMPANHAMENTO_PRAZO: "Acompanhamento de prazo",
  LEMBRETE_INTERNO: "Lembrete interno",
  CONCLUSAO_PROCEDIMENTO: "Conclusão do procedimento",
};

export const MESSAGE_DRAFT_STATUS_LABELS: Record<MessageDraftStatus, string> = {
  RASCUNHO: "Rascunho",
  ENVIADO_MANUALMENTE: "Enviado manualmente",
  CANCELADO: "Cancelado",
};
