import type { NextAuthConfig } from "next-auth";
import type { RoleName } from "@/generated/prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: RoleName;
    };
  }
  interface User {
    role: RoleName;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: RoleName;
  }
}

/**
 * Configuração compartilhada entre o Auth.js completo (Node, com Prisma)
 * e a instância usada no middleware (Edge Runtime, sem Prisma).
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id as string;
        token.role = user.role as RoleName;
      }
      return token;
    },
    session: async ({ session, token }) => {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
} satisfies NextAuthConfig;
