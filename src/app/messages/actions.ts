"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { renderMessageTemplate, type MessageVariables } from "@/lib/messages/template-render";
import { MESSAGE_CATEGORIES } from "@/lib/messages/message-labels";
import type { MessageChannel, MessageTemplateCategory } from "@/generated/prisma/client";

function textOrNull(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/**
 * Prepara um rascunho de mensagem preenchendo as variaveis do modelo a
 * partir dos dados do processo/cliente (secao 19). NUNCA envia nada --
 * apenas grava o rascunho para o usuario revisar e, se decidir, marcar
 * como enviado manualmente por fora do sistema.
 */
export async function createMessageDraft(formData: FormData) {
  const user = await requireRole(["ADMINISTRADOR", "ANALISTA"]);

  const templateId = formData.get("templateId");
  const channelRaw = formData.get("channel");
  const processNumber = textOrNull(formData.get("processNumber"));
  const clientIdInput = textOrNull(formData.get("clientId"));
  const documentos = textOrNull(formData.get("documentos"));

  if (typeof templateId !== "string" || !templateId) {
    throw new Error("Selecione um modelo de mensagem.");
  }

  const template = await prisma.messageTemplate.findUniqueOrThrow({ where: { id: templateId } });
  const channel: MessageChannel = channelRaw === "WHATSAPP" || channelRaw === "EMAIL" || channelRaw === "INTERNO"
    ? channelRaw
    : template.channel;

  let proceedingId: string | null = null;
  let clientId: string | null = clientIdInput;
  const variables: MessageVariables = { documentos };

  if (processNumber) {
    const proceeding = await prisma.proceeding.findUnique({
      where: { processNumber },
      include: {
        trademarks: true,
        clientProcesses: { include: { client: true } },
        publications: {
          include: { dispatchCode: true, responsible: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        deadlines: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (proceeding) {
      proceedingId = proceeding.id;
      variables.processo = proceeding.processNumber;
      variables.marca = proceeding.trademarks[0]?.name ?? null;

      const clientLink = proceeding.clientProcesses[0];
      if (!clientId && clientLink) clientId = clientLink.clientId;

      const latestPublication = proceeding.publications[0];
      if (latestPublication) {
        variables.despacho = latestPublication.dispatchCode?.code ?? null;
        variables.providencia =
          latestPublication.definedProvidence ?? latestPublication.suggestedProvidence ?? null;
        variables.responsavel = latestPublication.responsible?.name ?? null;
      }

      const latestDeadline = proceeding.deadlines[0];
      if (latestDeadline) {
        variables.prazo_interno = latestDeadline.internalDate
          ? new Date(latestDeadline.internalDate).toLocaleDateString("pt-BR")
          : null;
        variables.prazo_confirmado = latestDeadline.confirmedDate
          ? new Date(latestDeadline.confirmedDate).toLocaleDateString("pt-BR")
          : null;
      }
    }
  }

  if (clientId) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    variables.cliente = client?.name ?? null;
  }

  const body = renderMessageTemplate(template.bodyTemplate, variables);

  const draft = await prisma.messageDraft.create({
    data: {
      templateId,
      channel,
      recipient: textOrNull(formData.get("recipient")),
      clientId,
      proceedingId,
      body,
      preparedById: user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "CREATE_MESSAGE_DRAFT",
      entityType: "MessageDraft",
      entityId: draft.id,
      newValue: { templateId, channel, proceedingId },
    },
  });

  revalidatePath("/messages");
  redirect(`/messages/${draft.id}`);
}

export async function updateMessageDraftBody(formData: FormData) {
  const user = await requireRole(["ADMINISTRADOR", "ANALISTA"]);

  const draftId = formData.get("draftId");
  const body = formData.get("body");
  const recipient = textOrNull(formData.get("recipient"));
  if (typeof draftId !== "string" || typeof body !== "string") {
    throw new Error("Dados inválidos.");
  }

  const draft = await prisma.messageDraft.findUniqueOrThrow({ where: { id: draftId } });

  await prisma.$transaction([
    prisma.messageDraft.update({
      where: { id: draftId },
      data: { body, recipient, version: draft.version + 1 },
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE_MESSAGE_DRAFT_BODY",
        entityType: "MessageDraft",
        entityId: draftId,
        oldValue: { body: draft.body, recipient: draft.recipient, version: draft.version },
        newValue: { body, recipient, version: draft.version + 1 },
      },
    }),
  ]);

  revalidatePath(`/messages/${draftId}`);
}

/**
 * O usuario confirma que enviou a mensagem MANUALMENTE por fora do
 * sistema (WhatsApp/e-mail/etc.). O sistema nunca envia nada sozinho.
 */
export async function confirmManualSend(formData: FormData) {
  const user = await requireRole(["ADMINISTRADOR", "ANALISTA"]);

  const draftId = formData.get("draftId");
  if (typeof draftId !== "string") throw new Error("draftId ausente");

  await prisma.$transaction([
    prisma.messageDraft.update({
      where: { id: draftId },
      data: {
        status: "ENVIADO_MANUALMENTE",
        sentConfirmedById: user.id,
        sentConfirmedAt: new Date(),
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CONFIRM_MESSAGE_SENT",
        entityType: "MessageDraft",
        entityId: draftId,
        newValue: { status: "ENVIADO_MANUALMENTE" },
      },
    }),
  ]);

  revalidatePath(`/messages/${draftId}`);
  revalidatePath("/messages");
}

export async function cancelMessageDraft(formData: FormData) {
  const user = await requireRole(["ADMINISTRADOR", "ANALISTA"]);

  const draftId = formData.get("draftId");
  if (typeof draftId !== "string") throw new Error("draftId ausente");

  await prisma.$transaction([
    prisma.messageDraft.update({ where: { id: draftId }, data: { status: "CANCELADO" } }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CANCEL_MESSAGE_DRAFT",
        entityType: "MessageDraft",
        entityId: draftId,
        newValue: { status: "CANCELADO" },
      },
    }),
  ]);
  revalidatePath(`/messages/${draftId}`);
  revalidatePath("/messages");
}

export async function upsertMessageTemplate(formData: FormData) {
  const user = await requireRole(["ADMINISTRADOR"]);

  const templateId = textOrNull(formData.get("templateId"));
  const name = formData.get("name");
  const channel = formData.get("channel");
  const category = formData.get("category");
  const bodyTemplate = formData.get("bodyTemplate");

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof channel !== "string" ||
    typeof category !== "string" ||
    !MESSAGE_CATEGORIES.includes(category as MessageTemplateCategory) ||
    typeof bodyTemplate !== "string"
  ) {
    throw new Error("Preencha todos os campos do modelo.");
  }

  const data = {
    name: name.trim(),
    channel: channel as MessageChannel,
    category: category as MessageTemplateCategory,
    bodyTemplate,
    updatedById: user.id,
  };

  const template = templateId
    ? await prisma.messageTemplate.update({ where: { id: templateId }, data })
    : await prisma.messageTemplate.create({ data });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: templateId ? "UPDATE_MESSAGE_TEMPLATE" : "CREATE_MESSAGE_TEMPLATE",
      entityType: "MessageTemplate",
      entityId: template.id,
      newValue: { name: data.name, channel: data.channel, category: data.category },
    },
  });

  revalidatePath("/messages/templates");
}
