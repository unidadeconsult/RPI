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

  const templates: Array<{
    name: string;
    channel: "WHATSAPP" | "EMAIL" | "INTERNO";
    category:
      | "COMUNICACAO_PUBLICACAO"
      | "COMUNICACAO_OPOSICAO"
      | "COMUNICACAO_DEFERIMENTO"
      | "COBRANCA_PAGAMENTO"
      | "PEDIDO_DOCUMENTOS"
      | "PEDIDO_PROVAS_USO"
      | "COMUNICACAO_INDEFERIMENTO"
      | "ACOMPANHAMENTO_PRAZO"
      | "LEMBRETE_INTERNO"
      | "CONCLUSAO_PROCEDIMENTO";
    bodyTemplate: string;
  }> = [
    {
      name: "Comunicação de publicação (padrão)",
      channel: "EMAIL",
      category: "COMUNICACAO_PUBLICACAO",
      bodyTemplate:
        "Prezado(a) {{cliente}},\n\nInformamos que houve uma publicação referente à marca {{marca}} (processo {{processo}}), com o despacho {{despacho}}.\n\nEsta comunicação é informativa e não substitui a análise jurídica do caso. Permanecemos à disposição.\n\nResponsável: {{responsavel}}",
    },
    {
      name: "Comunicação de oposição (padrão)",
      channel: "EMAIL",
      category: "COMUNICACAO_OPOSICAO",
      bodyTemplate:
        "Prezado(a) {{cliente}},\n\nO processo {{processo}} (marca {{marca}}) recebeu uma oposição de terceiro. Nossa equipe está avaliando o caso.\n\nPrazo interno de acompanhamento: {{prazo_interno}}. Prazo oficial confirmado: {{prazo_confirmado}}.\n\nResponsável: {{responsavel}}",
    },
    {
      name: "Comunicação de deferimento (padrão)",
      channel: "EMAIL",
      category: "COMUNICACAO_DEFERIMENTO",
      bodyTemplate:
        "Prezado(a) {{cliente}},\n\nTemos a satisfação de informar que o processo {{processo}} (marca {{marca}}) recebeu decisão de deferimento.\n\nProvidência sugerida: {{providencia}}.\n\nResponsável: {{responsavel}}",
    },
    {
      name: "Cobrança de pagamento (padrão)",
      channel: "WHATSAPP",
      category: "COBRANCA_PAGAMENTO",
      bodyTemplate:
        "Olá, {{cliente}}! Sobre o processo {{processo}} ({{marca}}), há um pagamento pendente relacionado à providência: {{providencia}}. Prazo interno: {{prazo_interno}}.",
    },
    {
      name: "Pedido de documentos (padrão)",
      channel: "EMAIL",
      category: "PEDIDO_DOCUMENTOS",
      bodyTemplate:
        "Prezado(a) {{cliente}},\n\nPara darmos andamento ao processo {{processo}} ({{marca}}), precisamos dos seguintes documentos: {{documentos}}.\n\nPrazo interno para envio: {{prazo_interno}}.\n\nResponsável: {{responsavel}}",
    },
    {
      name: "Pedido de provas de uso (padrão)",
      channel: "EMAIL",
      category: "PEDIDO_PROVAS_USO",
      bodyTemplate:
        "Prezado(a) {{cliente}},\n\nO processo {{processo}} ({{marca}}) está sujeito a um procedimento de caducidade e requer comprovação de uso da marca.\n\nDocumentos necessários: {{documentos}}. Prazo confirmado: {{prazo_confirmado}}.\n\nResponsável: {{responsavel}}",
    },
    {
      name: "Comunicação de indeferimento (padrão)",
      channel: "EMAIL",
      category: "COMUNICACAO_INDEFERIMENTO",
      bodyTemplate:
        "Prezado(a) {{cliente}},\n\nInformamos que o processo {{processo}} ({{marca}}) recebeu decisão de indeferimento.\n\nNossa equipe está avaliando os fundamentos e a possibilidade de recurso. Providência sugerida: {{providencia}}.\n\nEsta comunicação é informativa e não substitui a análise jurídica do caso.\n\nResponsável: {{responsavel}}",
    },
    {
      name: "Acompanhamento de prazo (padrão)",
      channel: "WHATSAPP",
      category: "ACOMPANHAMENTO_PRAZO",
      bodyTemplate:
        "Olá, {{cliente}}! Lembrete sobre o processo {{processo}} ({{marca}}): prazo confirmado em {{prazo_confirmado}} (data limite interna: {{prazo_interno}}).",
    },
    {
      name: "Lembrete interno (padrão)",
      channel: "INTERNO",
      category: "LEMBRETE_INTERNO",
      bodyTemplate:
        "Lembrete interno sobre o processo {{processo}} ({{marca}}): providência pendente: {{providencia}}. Responsável: {{responsavel}}. Prazo interno: {{prazo_interno}}.",
    },
    {
      name: "Conclusão do procedimento (padrão)",
      channel: "EMAIL",
      category: "CONCLUSAO_PROCEDIMENTO",
      bodyTemplate:
        "Prezado(a) {{cliente}},\n\nInformamos que o procedimento referente ao processo {{processo}} ({{marca}}) foi concluído.\n\nResponsável: {{responsavel}}.",
    },
  ];

  for (const template of templates) {
    const existing = await prisma.messageTemplate.findFirst({
      where: { category: template.category, channel: template.channel },
    });
    if (!existing) {
      await prisma.messageTemplate.create({ data: template });
    }
  }
  console.log(`Modelos de mensagem verificados/criados: ${templates.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
