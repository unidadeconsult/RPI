"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

function splitList(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Cadastra uma marca a ser monitorada (secao 20). O sistema apenas sinaliza
 * semelhancas textuais para revisao humana -- nunca decide sozinho que ha
 * colidencia juridica.
 */
export async function createMonitoredTrademark(formData: FormData) {
  const user = await requireRole(["ADMINISTRADOR", "ANALISTA"]);

  const mainExpression = formData.get("mainExpression");
  if (typeof mainExpression !== "string" || mainExpression.trim() === "") {
    throw new Error("Expressão principal é obrigatória");
  }

  const titular = formData.get("titular");
  const clientId = formData.get("clientId");
  const minSimilarityRaw = formData.get("minSimilarity");
  const minSimilarity = typeof minSimilarityRaw === "string" ? Number.parseFloat(minSimilarityRaw) : 0.7;

  await prisma.monitoredTrademark.create({
    data: {
      mainExpression: mainExpression.trim(),
      variations: splitList(formData.get("variations")),
      relevantWords: splitList(formData.get("relevantWords")),
      niceClasses: splitList(formData.get("niceClasses")),
      ignoredTerms: splitList(formData.get("ignoredTerms")),
      titular: typeof titular === "string" && titular.trim() !== "" ? titular.trim() : null,
      clientId: typeof clientId === "string" && clientId !== "" ? clientId : null,
      minSimilarity: Number.isFinite(minSimilarity) ? Math.min(1, Math.max(0, minSimilarity)) : 0.7,
      createdById: user.id,
    },
  });

  revalidatePath("/monitored-trademarks");
}

export async function toggleMonitoredTrademarkActive(formData: FormData) {
  await requireRole(["ADMINISTRADOR", "ANALISTA"]);

  const id = formData.get("id");
  if (typeof id !== "string") throw new Error("id ausente");

  const current = await prisma.monitoredTrademark.findUniqueOrThrow({ where: { id } });
  await prisma.monitoredTrademark.update({ where: { id }, data: { active: !current.active } });

  revalidatePath("/monitored-trademarks");
}
