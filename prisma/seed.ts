import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@rpimanager.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "TrocarSenha!123";

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Administrador",
      email: adminEmail,
      passwordHash,
      role: "ADMINISTRADOR",
    },
  });

  console.log(`Usuário administrador disponível: ${admin.email}`);
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log(
      "Senha padrão de desenvolvimento: TrocarSenha!123 — troque antes de usar em produção.",
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
