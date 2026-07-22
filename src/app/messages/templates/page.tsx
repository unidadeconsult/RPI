import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  MESSAGE_CATEGORIES,
  MESSAGE_CATEGORY_LABELS,
  MESSAGE_CHANNELS,
  MESSAGE_CHANNEL_LABELS,
} from "@/lib/messages/message-labels";
import { upsertMessageTemplate } from "../actions";

export default async function MessageTemplatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const isAdmin = session.user.role === "ADMINISTRADOR";

  const templates = await prisma.messageTemplate.findMany({
    orderBy: [{ category: "asc" }, { channel: "asc" }],
  });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <Link href="/messages" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Voltar às mensagens
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Modelos de mensagem</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Use variáveis como {"{{cliente}}"}, {"{{marca}}"}, {"{{processo}}"}, {"{{despacho}}"},{" "}
          {"{{providencia}}"}, {"{{documentos}}"}, {"{{prazo_interno}}"}, {"{{prazo_confirmado}}"} e{" "}
          {"{{responsavel}}"}.
        </p>
      </header>

      {isAdmin && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-semibold">Novo modelo</h2>
          <form action={upsertMessageTemplate} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              Nome
              <input type="text" name="name" required className="rounded-md border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Canal
              <select name="channel" defaultValue="EMAIL" className="rounded-md border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950">
                {MESSAGE_CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {MESSAGE_CHANNEL_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Categoria
              <select name="category" defaultValue={MESSAGE_CATEGORIES[0]} className="rounded-md border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950">
                {MESSAGE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {MESSAGE_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              Texto do modelo
              <textarea name="bodyTemplate" rows={4} required className="rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <button type="submit" className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 sm:col-span-2 dark:bg-slate-100 dark:text-slate-900">
              Salvar modelo
            </button>
          </form>
        </section>
      )}

      <section className="flex flex-col gap-4">
        {templates.map((template) => (
          <details key={template.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <summary className="cursor-pointer font-medium">
              {template.name} — {MESSAGE_CHANNEL_LABELS[template.channel]} —{" "}
              {MESSAGE_CATEGORY_LABELS[template.category]}
            </summary>
            {isAdmin ? (
              <form action={upsertMessageTemplate} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input type="hidden" name="templateId" value={template.id} />
                <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                  Nome
                  <input type="text" name="name" defaultValue={template.name} required className="rounded-md border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950" />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Canal
                  <select name="channel" defaultValue={template.channel} className="rounded-md border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950">
                    {MESSAGE_CHANNELS.map((c) => (
                      <option key={c} value={c}>
                        {MESSAGE_CHANNEL_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Categoria
                  <select name="category" defaultValue={template.category} className="rounded-md border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950">
                    {MESSAGE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {MESSAGE_CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                  Texto do modelo
                  <textarea
                    name="bodyTemplate"
                    rows={4}
                    defaultValue={template.bodyTemplate}
                    className="rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>
                <button type="submit" className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 sm:col-span-2 dark:bg-slate-100 dark:text-slate-900">
                  Salvar alterações
                </button>
              </form>
            ) : (
              <pre className="mt-3 whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-xs dark:bg-slate-950">
                {template.bodyTemplate}
              </pre>
            )}
          </details>
        ))}
      </section>
    </main>
  );
}
