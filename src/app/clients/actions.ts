"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import type { PersonType } from "@/generated/prisma/client";

function textOrNull(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/**
 * Cadastra um cliente (secao 14). Se um processo estiver aguardando
 * vinculacao (secao 14: "PROCESSO ENCONTRADO NA RPI, MAS NAO LOCALIZADO
 * NA CARTEIRA"), vincula automaticamente apos criar.
 */
export async function createClient(formData: FormData) {
  const user = await requireRole(["ADMINISTRADOR", "ANALISTA"]);

  const name = formData.get("name");
  if (typeof name !== "string" || name.trim() === "") {
    throw new Error("Nome do cliente é obrigatório.");
  }

  const personTypeRaw = formData.get("personType");
  const personType: PersonType = personTypeRaw === "PJ" ? "PJ" : "PF";
  const proceedingId = textOrNull(formData.get("proceedingId"));

  const client = await prisma.client.create({
    data: {
      name: name.trim(),
      personType,
      cpfCnpj: textOrNull(formData.get("cpfCnpj")),
      phone: textOrNull(formData.get("phone")),
      whatsapp: textOrNull(formData.get("whatsapp")),
      email: textOrNull(formData.get("email")),
      address: textOrNull(formData.get("address")),
      internalResponsibleId: textOrNull(formData.get("internalResponsibleId")) ?? user.id,
      notes: textOrNull(formData.get("notes")),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "CREATE_CLIENT",
      entityType: "Client",
      entityId: client.id,
      newValue: { name: client.name, personType: client.personType },
    },
  });

  if (proceedingId) {
    await linkClientToProceedingInternal(proceedingId, client.id, user.id);
    redirect(`/proceedings/${proceedingId}`);
  }

  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export async function linkExistingClient(formData: FormData) {
  const user = await requireRole(["ADMINISTRADOR", "ANALISTA"]);

  const proceedingId = formData.get("proceedingId");
  const clientId = formData.get("clientId");
  if (typeof proceedingId !== "string" || typeof clientId !== "string" || !clientId) {
    throw new Error("Selecione um cliente.");
  }

  await linkClientToProceedingInternal(proceedingId, clientId, user.id);
  revalidatePath(`/proceedings/${proceedingId}`);
}

async function linkClientToProceedingInternal(
  proceedingId: string,
  clientId: string,
  userId: string,
) {
  await prisma.clientProcess.upsert({
    where: { clientId_proceedingId: { clientId, proceedingId } },
    update: {},
    create: { clientId, proceedingId },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "LINK_CLIENT_PROCESS",
      entityType: "ClientProcess",
      entityId: proceedingId,
      newValue: { clientId, proceedingId },
    },
  });
}
