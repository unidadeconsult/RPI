import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/**
 * Instância mínima do Auth.js usada apenas para verificar a sessão no
 * middleware (Edge Runtime). Não inclui o provider de credenciais nem o
 * Prisma Client, que dependem de APIs do Node indisponíveis no Edge.
 */
export const { auth } = NextAuth(authConfig);
