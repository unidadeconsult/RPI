"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { normalizeName } from "@/lib/parser/normalize-text";
import { JANE_GLAUCIA_VIEIRA_NORMALIZED } from "@/lib/parser/attorney-matcher";

/**
 * Cadastra manualmente uma variacao aceita do nome de JANE GLAUCIA VIEIRA
 * (secao 3): "Exemplos como 'JANE G. VIEIRA' somente poderao ser aceitos
 * se essa variacao for cadastrada manualmente pelo administrador." Sem
 * esta acao, nenhuma abreviacao ou grafia alternativa jamais e aceita --
 * o sistema nunca infere uma variacao sozinho.
 */
export async function createAttorneyNameAlias(formData: FormData) {
  const user = await requireRole(["ADMINISTRADOR"]);

  const aliasRaw = formData.get("aliasRaw");
  if (typeof aliasRaw !== "string" || aliasRaw.trim() === "") {
    throw new Error("Informe a variação do nome.");
  }

  const aliasNormalized = normalizeName(aliasRaw);
  if (aliasNormalized === JANE_GLAUCIA_VIEIRA_NORMALIZED) {
    throw new Error("Esta já é a grafia exata de JANE GLAUCIA VIEIRA — não é necessário cadastrar variação.");
  }

  const existing = await prisma.attorneyNameAlias.findFirst({
    where: { aliasNormalized, active: true },
  });
  if (existing) {
    throw new Error("Esta variação já está cadastrada e ativa.");
  }

  const canonicalAttorney = await prisma.attorney.upsert({
    where: { normalizedName: JANE_GLAUCIA_VIEIRA_NORMALIZED },
    update: {},
    create: { nameRaw: "JANE GLAUCIA VIEIRA", normalizedName: JANE_GLAUCIA_VIEIRA_NORMALIZED },
  });

  const alias = await prisma.attorneyNameAlias.create({
    data: {
      attorneyId: canonicalAttorney.id,
      aliasRaw: aliasRaw.trim(),
      aliasNormalized,
      createdById: user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "CREATE_ATTORNEY_NAME_ALIAS",
      entityType: "AttorneyNameAlias",
      entityId: alias.id,
      newValue: { aliasRaw: alias.aliasRaw, aliasNormalized },
    },
  });

  revalidatePath("/attorney-name-aliases");
}

export async function toggleAttorneyNameAliasActive(formData: FormData) {
  const user = await requireRole(["ADMINISTRADOR"]);

  const id = formData.get("id");
  if (typeof id !== "string") throw new Error("id ausente");

  const current = await prisma.attorneyNameAlias.findUniqueOrThrow({ where: { id } });

  await prisma.$transaction([
    prisma.attorneyNameAlias.update({ where: { id }, data: { active: !current.active } }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "TOGGLE_ATTORNEY_NAME_ALIAS_ACTIVE",
        entityType: "AttorneyNameAlias",
        entityId: id,
        oldValue: { active: current.active },
        newValue: { active: !current.active },
      },
    }),
  ]);

  revalidatePath("/attorney-name-aliases");
}
