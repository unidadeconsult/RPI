/**
 * Rotulos legiveis para toda acao registrada em AuditLog (secao 26).
 * Mantido em um unico lugar para que a tela global de auditoria e o
 * historico por processo mostrem sempre a mesma descricao.
 */
const AUDIT_ACTION_LABELS: Record<string, string> = {
  IMPORT_RPI: "Edição da RPI importada",
  UPDATE_PUBLICATION_FIELDS: "Dados da publicação foram corrigidos",
  TOGGLE_REVIEW_STATUS: "Status de revisão foi alterado",
  CREATE_CLIENT: "Cliente cadastrado",
  LINK_CLIENT_PROCESS: "Processo vinculado a um cliente",
  CREATE_TASK: "Tarefa criada",
  UPDATE_TASK_STATUS: "Status da tarefa alterado",
  UPDATE_TASK_FIELDS: "Dados da tarefa atualizados",
  ADD_TASK_COMMENT: "Comentário adicionado à tarefa",
  TOGGLE_TASK_CHECKLIST_ITEM: "Item do checklist da tarefa marcado/desmarcado",
  ADD_TASK_CHECKLIST_ITEM: "Item adicionado ao checklist da tarefa",
  CREATE_DEADLINE: "Prazo criado",
  CONFIRM_DEADLINE: "Prazo confirmado",
  CANCEL_DEADLINE: "Prazo cancelado",
  CREATE_CALENDAR_EVENT: "Evento de calendário criado",
  RESCHEDULE_CALENDAR_EVENT: "Evento de calendário reagendado",
  TOGGLE_CALENDAR_EVENT_CONFIRMED: "Confirmação do evento de calendário alterada",
  UPLOAD_DOCUMENT: "Documento enviado",
  UPLOAD_DOCUMENT_VERSION: "Nova versão de documento enviada",
  CREATE_MESSAGE_DRAFT: "Rascunho de mensagem preparado",
  UPDATE_MESSAGE_DRAFT_BODY: "Texto do rascunho de mensagem editado",
  CONFIRM_MESSAGE_SENT: "Envio manual de mensagem confirmado",
  CANCEL_MESSAGE_DRAFT: "Rascunho de mensagem cancelado",
  CREATE_MESSAGE_TEMPLATE: "Modelo de mensagem criado",
  UPDATE_MESSAGE_TEMPLATE: "Modelo de mensagem atualizado",
  CREATE_MONITORED_TRADEMARK: "Marca monitorada cadastrada",
  TOGGLE_MONITORED_TRADEMARK_ACTIVE: "Marca monitorada ativada/desativada",
  REVIEW_SIMILARITY_MATCH: "Semelhança de marca revisada",
};

export function describeAuditAction(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

export const AUDIT_ACTIONS = Object.keys(AUDIT_ACTION_LABELS);

const ENTITY_ROUTE_BUILDERS: Record<string, (entityId: string) => string> = {
  Publication: (id) => `/publications/${id}`,
  Task: (id) => `/tasks/${id}`,
  Deadline: () => `/deadlines`,
  Client: (id) => `/clients/${id}`,
  Document: (id) => `/documents/${id}`,
  MessageDraft: (id) => `/messages/${id}`,
  MessageTemplate: () => `/messages/templates`,
  MonitoredTrademark: () => `/monitored-trademarks`,
  SimilarityMatch: () => `/similarity-matches?status=NOVO`,
  CalendarEvent: () => `/calendar`,
};

/** Retorna um link para o registro afetado, quando existe uma tela de destino conhecida. */
export function buildAuditEntityHref(entityType: string, entityId: string | null): string | null {
  if (!entityId) return null;
  const builder = ENTITY_ROUTE_BUILDERS[entityType];
  return builder ? builder(entityId) : null;
}
