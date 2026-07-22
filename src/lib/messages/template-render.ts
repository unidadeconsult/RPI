/**
 * Preenchimento de variaveis do modelo de mensagem (secao 19). Apenas
 * substituicao de texto -- nenhuma decisao juridica e feita aqui, e o
 * rascunho gerado deve sempre ser revisado pelo usuario antes de
 * qualquer confirmacao de envio manual.
 */
export type MessageVariables = {
  cliente?: string | null;
  marca?: string | null;
  processo?: string | null;
  despacho?: string | null;
  providencia?: string | null;
  documentos?: string | null;
  prazo_interno?: string | null;
  prazo_confirmado?: string | null;
  responsavel?: string | null;
};

const VARIABLE_LABELS: Record<keyof MessageVariables, string> = {
  cliente: "nome do cliente",
  marca: "marca",
  processo: "número do processo",
  despacho: "despacho",
  providencia: "providência",
  documentos: "documentos solicitados",
  prazo_interno: "data limite interna",
  prazo_confirmado: "prazo confirmado",
  responsavel: "responsável pelo atendimento",
};

export function renderMessageTemplate(
  bodyTemplate: string,
  variables: MessageVariables,
): string {
  return bodyTemplate.replace(/{{\s*(\w+)\s*}}/g, (match, key: string) => {
    const value = variables[key as keyof MessageVariables];
    if (value) return value;
    const label = VARIABLE_LABELS[key as keyof MessageVariables];
    return label ? `[${label} não informado]` : match;
  });
}
