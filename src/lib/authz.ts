import { auth } from "@/auth";
import type { RoleName } from "@/generated/prisma/client";

export class ForbiddenError extends Error {
  constructor(message = "Acesso não autorizado para este perfil.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Garante que o usuário autenticado possui um dos perfis informados.
 * Uso em Server Components, Route Handlers e Server Actions.
 */
export async function requireRole(allowedRoles: RoleName[]) {
  const session = await auth();
  if (!session?.user) {
    throw new ForbiddenError("Sessão não encontrada. Faça login novamente.");
  }
  if (!allowedRoles.includes(session.user.role)) {
    throw new ForbiddenError();
  }
  return session.user;
}

export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    throw new ForbiddenError("Sessão não encontrada. Faça login novamente.");
  }
  return session.user;
}
