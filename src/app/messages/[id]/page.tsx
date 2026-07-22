import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MESSAGE_CHANNEL_LABELS, MESSAGE_DRAFT_STATUS_LABELS } from "@/lib/messages/message-labels";
import { cancelMessageDraft, confirmManualSend, updateMessageDraftBody } from "../actions";

export default async function MessageDraftDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const canEdit = session.user.role !== "CONSULTA";

  const { id } = await params;

  const draft = await prisma.messageDraft.findUnique({
    where: { id },
    include: {
      template: true,
      client: true,
      proceeding: true,
      preparedBy: true,
      sentConfirmedBy: true,
    },
  });

  if (!draft) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <Link href="/messages" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Voltar às mensagens
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">
          {MESSAGE_CHANNEL_LABELS[draft.channel]} — {MESSAGE_DRAFT_STATUS_LABELS[draft.status]}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {draft.proceeding && <>Processo {draft.proceeding.processNumber} — </>}
          {draft.client?.name ?? "Sem cliente vinculado"}
        </p>
      </header>

      <section
        key={`${draft.version}-${draft.status}`}
        className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Revise o texto abaixo antes de enviar manualmente pelo canal escolhido. O sistema não
          envia mensagens automaticamente.
        </p>

        <form action={updateMessageDraftBody} className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="draftId" value={draft.id} />
          <label className="flex flex-col gap-1 text-sm">
            Destinatário
            <input
              type="text"
              name="recipient"
              defaultValue={draft.recipient ?? ""}
              disabled={!canEdit || draft.status !== "RASCUNHO"}
              className="rounded-md border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Texto da mensagem (versão {draft.version})
            <textarea
              name="body"
              rows={10}
              defaultValue={draft.body}
              disabled={!canEdit || draft.status !== "RASCUNHO"}
              className="rounded-md border border-slate-300 px-2 py-1.5 font-mono text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          {canEdit && draft.status === "RASCUNHO" && (
            <button type="submit" className="self-start rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-900">
              Salvar edição
            </button>
          )}
        </form>

        {canEdit && draft.status === "RASCUNHO" && (
          <div className="mt-4 flex gap-3">
            <form action={confirmManualSend}>
              <input type="hidden" name="draftId" value={draft.id} />
              <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900">
                Confirmar envio manual
              </button>
            </form>
            <form action={cancelMessageDraft}>
              <input type="hidden" name="draftId" value={draft.id} />
              <button type="submit" className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-900">
                Cancelar
              </button>
            </form>
          </div>
        )}

        {draft.status === "ENVIADO_MANUALMENTE" && (
          <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-400">
            Envio confirmado manualmente por {draft.sentConfirmedBy?.name} em{" "}
            {draft.sentConfirmedAt && new Date(draft.sentConfirmedAt).toLocaleString("pt-BR")}.
          </p>
        )}
      </section>
    </main>
  );
}
