"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { DISPATCH_CATEGORIES } from "@/lib/dashboard/publication-filters";
import { URGENCY_LEVELS } from "@/lib/dispatch-rules/dispatch-rule-labels";
import type { DispatchCategory, UrgencyLevel } from "@/generated/prisma/client";

function textOrNull(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/**
 * Cria ou atualiza a regra de classificacao de um codigo de despacho
 * (secao 7). Esta e a UNICA forma de um codigo deixar de ser
 * "OUTROS / NAO CLASSIFICADO" -- o sistema nunca classifica por palavras
 * soltas nem infere a regra sozinho.
 */
export async function upsertDispatchRule(formData: FormData) {
  const user = await requireRole(["ADMINISTRADOR"]);

  const code = formData.get("code");
  if (typeof code !== "string" || code.trim() === "") {
    throw new Error("Código do despacho é obrigatório.");
  }

  const mainCategoryRaw = formData.get("mainCategory");
  if (
    typeof mainCategoryRaw !== "string" ||
    !DISPATCH_CATEGORIES.includes(mainCategoryRaw as DispatchCategory)
  ) {
    throw new Error("Categoria principal inválida.");
  }
  const mainCategory = mainCategoryRaw as DispatchCategory;

  const urgencyRaw = formData.get("urgencyLevel");
  const urgencyLevel: UrgencyLevel = URGENCY_LEVELS.includes(urgencyRaw as UrgencyLevel)
    ? (urgencyRaw as UrgencyLevel)
    : "MEDIA";

  const officialDescription = textOrNull(formData.get("officialDescription"));
  const subcategory = textOrNull(formData.get("subcategory"));
  const suggestedProvidence = textOrNull(formData.get("suggestedProvidence"));
  const deadlineRuleDescription = textOrNull(formData.get("deadlineRuleDescription"));
  const requiredDocuments = textOrNull(formData.get("requiredDocuments"));
  const hasDeadline = formData.get("hasDeadline") === "on";
  const active = formData.get("active") === "on";

  const dispatchCode = await prisma.dispatchCode.upsert({
    where: { code: code.trim() },
    update: { officialDescription },
    create: { code: code.trim(), officialDescription },
  });

  const existingRule = await prisma.dispatchRule.findUnique({
    where: { dispatchCodeId: dispatchCode.id },
  });

  const ruleData = {
    mainCategory,
    subcategory,
    suggestedProvidence,
    urgencyLevel,
    hasDeadline,
    deadlineRuleDescription,
    requiredDocuments,
    active,
    updatedById: user.id,
  };

  const rule = existingRule
    ? await prisma.dispatchRule.update({ where: { id: existingRule.id }, data: ruleData })
    : await prisma.dispatchRule.create({ data: { dispatchCodeId: dispatchCode.id, ...ruleData } });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: existingRule ? "UPDATE_DISPATCH_RULE" : "CREATE_DISPATCH_RULE",
      entityType: "DispatchRule",
      entityId: rule.id,
      oldValue: existingRule ?? undefined,
      newValue: { code: dispatchCode.code, ...ruleData },
    },
  });

  revalidatePath("/dispatch-rules");
}
