import type { DocumentType } from "@/generated/prisma/client";

export const DOCUMENT_TYPES: DocumentType[] = [
  "PROCURACAO",
  "CONTRATO_SOCIAL",
  "PARECER",
  "PETICAO",
  "OPOSICAO",
  "MANIFESTACAO",
  "RECURSO",
  "BOLETO",
  "COMPROVANTE_PAGAMENTO",
  "PROTOCOLO",
  "EVIDENCIA_USO",
  "CERTIFICADO",
  "EMAIL",
  "DIVERSO",
];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  PROCURACAO: "Procuração",
  CONTRATO_SOCIAL: "Contrato social",
  PARECER: "Parecer",
  PETICAO: "Petição",
  OPOSICAO: "Oposição",
  MANIFESTACAO: "Manifestação",
  RECURSO: "Recurso",
  BOLETO: "Boleto",
  COMPROVANTE_PAGAMENTO: "Comprovante de pagamento",
  PROTOCOLO: "Protocolo",
  EVIDENCIA_USO: "Evidência de uso",
  CERTIFICADO: "Certificado",
  EMAIL: "E-mail",
  DIVERSO: "Documento diverso",
};
