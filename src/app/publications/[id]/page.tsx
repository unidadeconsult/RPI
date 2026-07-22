import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CATEGORY_LABELS, DISPATCH_CATEGORIES } from "@/lib/dashboard/publication-filters";
import { updatePublicationFields } from "./actions";
import { toggleReviewStatus } from "@/app/dashboard-actions";
import { createDeadline } from "@/app/deadlines/actions";
import { computeDeadlineUrgency, DEADLINE_URGENCY_LABELS } from "@/lib/deadlines/deadline-calc";

export default async function PublicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const [publication, users] = await Promise.all([
    prisma.publication.findUnique({
      where: { id },
      include: {
        rpiEdition: true,
        rpiFile: true,
        dispatchCode: true,
        proceeding: { include: { trademarks: { include: { classes: true } } } },
        parties: true,
        attorneyLinks: { include: { attorney: true } },
        responsible: true,
        reviewer: true,
        importedBy: true,
      },
    }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  if (!publication) notFound();

  const deadlines = await prisma.deadline.findMany({
    where: { publicationId: publication.id, status: { not: "CANCELADO" } },
    include: { confirmedBy: true },
    orderBy: { createdAt: "asc" },
  });

  const canEdit = session.user.role !== "CONSULTA";
  const trademark = publication.proceeding?.trademarks[0];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
            ← Voltar ao dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">
            Processo {publication.processNumberRaw ?? "—"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            RPI {publication.rpiEdition.number} —{" "}
            {new Date(publication.rpiEdition.publicationDate).toLocaleDateString("pt-BR")}
          </p>
          {publication.proceedingId && (
            <Link
              href={`/proceedings/${publication.proceedingId}`}
              className="text-sm text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
            >
              Ver histórico completo do processo
            </Link>
          )}
        </div>
        {canEdit && (
          <div className="flex items-center gap-3">
            <Link
              href={`/tasks?publicationId=${publication.id}`}
              className="btn-secondary"
            >
              Criar tarefa
            </Link>
            <form action={toggleReviewStatus}>
              <input type="hidden" name="publicationId" value={publication.id} />
              <button
                type="submit"
                className="btn-secondary"
              >
                {publication.reviewStatus === "REVISADO"
                  ? "Marcar como não revisado"
                  : "Marcar como revisado"}
              </button>
            </form>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Lado esquerdo: dados interpretados pelo sistema */}
        <section className="flex flex-col gap-4 surface-card p-6">
          <h2 className="font-semibold">Dados interpretados</h2>

          <form
            key={publication.updatedAt.toISOString()}
            action={updatePublicationFields}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="publicationId" value={publication.id} />

            <Field label="Categoria">
              <select
                name="category"
                defaultValue={publication.category}
                disabled={!canEdit}
                className="field"
              >
                {DISPATCH_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
              {publication.categoryIsUnknownCode && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Código de despacho ainda não classificado pelo administrador.
                </p>
              )}
            </Field>

            <Field label="Subcategoria">
              <input
                type="text"
                name="subcategory"
                defaultValue={publication.subcategory ?? ""}
                disabled={!canEdit}
                className="field"
              />
            </Field>

            <Field label="Providência sugerida (automática)">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {publication.suggestedProvidence ?? "— (regra ainda não cadastrada para este código)"}
              </p>
            </Field>

            <Field label="Providência definida (decisão do responsável)">
              <textarea
                name="definedProvidence"
                defaultValue={publication.definedProvidence ?? ""}
                disabled={!canEdit}
                rows={2}
                className="field"
                placeholder="Ainda não definida"
              />
            </Field>

            <Field label="Responsável">
              <select
                name="responsibleUserId"
                defaultValue={publication.responsibleUserId ?? ""}
                disabled={!canEdit}
                className="field"
              >
                <option value="">Sem responsável definido</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Observações">
              <textarea
                name="notes"
                defaultValue={publication.notes ?? ""}
                disabled={!canEdit}
                rows={3}
                className="field"
              />
            </Field>

            {canEdit && (
              <button
                type="submit"
                className="self-start btn-primary"
              >
                Salvar alterações
              </button>
            )}
          </form>

          <hr className="border-slate-200 dark:border-slate-800" />

          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoItem label="Marca" value={trademark?.name ?? "—"} />
            <InfoItem
              label="Classe(s)"
              value={trademark?.classes.map((c) => c.niceClass).join(", ") || "—"}
            />
            <InfoItem
              label="Titular(es)"
              value={publication.parties.map((p) => p.name).join(" / ") || "—"}
            />
            <InfoItem
              label="Cliente vinculado"
              value="Processo ainda não localizado na carteira (módulo de clientes em construção)"
            />
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          <div>
            <p className="text-sm font-medium">Prazos</p>
            {deadlines.map((deadline) => {
              const operativeDate = deadline.confirmedDate ?? deadline.suggestedDate;
              const urgency = computeDeadlineUrgency(operativeDate);
              return (
                <div
                  key={deadline.id}
                  className="mt-2 rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800"
                >
                  <p className="font-medium">{deadline.eventLabel}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {deadline.daysConfigured} dias {deadline.countingType?.toLowerCase()} a partir de{" "}
                    {new Date(deadline.publicationDate).toLocaleDateString("pt-BR")} — sugerido:{" "}
                    {deadline.suggestedDate &&
                      new Date(deadline.suggestedDate).toLocaleDateString("pt-BR")}
                  </p>
                  {deadline.status === "CONFIRMADO" ? (
                    <p className="text-xs">
                      Confirmado para{" "}
                      {deadline.confirmedDate &&
                        new Date(deadline.confirmedDate).toLocaleDateString("pt-BR")}{" "}
                      por {deadline.confirmedBy?.name}
                    </p>
                  ) : (
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      PRAZO SUGERIDO — CONFERIR
                    </p>
                  )}
                  <p className="text-xs">{DEADLINE_URGENCY_LABELS[urgency]}</p>
                </div>
              );
            })}
            {deadlines.length === 0 && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Nenhum prazo cadastrado para esta publicação.
              </p>
            )}

            {canEdit && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400">
                  Adicionar prazo
                </summary>
                <form action={createDeadline} className="mt-2 flex flex-col gap-2">
                  <input type="hidden" name="publicationId" value={publication.id} />
                  <input
                    type="text"
                    name="eventLabel"
                    placeholder="Evento inicial (ex.: publicação do despacho)"
                    required
                    className="field"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      name="daysConfigured"
                      placeholder="Dias"
                      required
                      min={0}
                      className="w-24 field"
                    />
                    <select
                      name="countingType"
                      defaultValue="CORRIDOS"
                      className="field"
                    >
                      <option value="CORRIDOS">Dias corridos</option>
                      <option value="UTEIS">Dias úteis</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="self-start btn-primary"
                  >
                    Calcular prazo sugerido
                  </button>
                </form>
              </details>
            )}
          </div>
        </section>

        {/* Lado direito: publicacao original */}
        <section className="flex flex-col gap-4 surface-card p-6">
          <h2 className="font-semibold">Publicação original</h2>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoItem label="Arquivo" value={publication.rpiFile.originalFilename} />
            <InfoItem
              label="Página do PDF"
              value={publication.pdfPageNumber ? String(publication.pdfPageNumber) : "—"}
            />
            <InfoItem label="Código do despacho" value={publication.dispatchCode?.code ?? "—"} />
            <InfoItem label="Fonte da extração" value={publication.extractionSource} />
          </div>

          <div>
            <p className="text-sm font-medium">Trecho original</p>
            <pre className="mt-1 whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-xs dark:bg-slate-950">
              {publication.sourceExcerpt}
            </pre>
          </div>

          <div>
            <p className="text-sm font-medium">Vínculo com o campo de procurador</p>
            {publication.attorneyLinks.map((link) => (
              <div
                key={link.id}
                className="mt-1 rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800"
              >
                <p>
                  <span className="font-medium">{link.attorney.nameRaw}</span> —{" "}
                  {link.matchStatus === "CONFIRMADO" ? (
                    <span className="text-emerald-600 dark:text-emerald-400">confirmado</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">
                      VÍNCULO NÃO CONFIRMADO — REVISAR
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Campo identificado: {link.sourceFieldTag}
                </p>
                {link.sourceExcerpt && (
                  <mark className="mt-1 block rounded bg-yellow-100 px-1 py-0.5 text-xs dark:bg-yellow-900/40">
                    {link.sourceExcerpt}
                  </mark>
                )}
              </div>
            ))}
          </div>

          <div>
            <p className="text-sm font-medium">Localização (/PE)</p>
            <p className="text-sm">
              Status: <PeStatusLabel status={publication.peStatus} />
            </p>
            {publication.peSourceExcerpt && (
              <mark className="mt-1 block rounded bg-yellow-100 px-1 py-0.5 text-xs dark:bg-yellow-900/40">
                {publication.peSourceExcerpt}
              </mark>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoItem
              label="Nível de confiança"
              value={`${publication.confidenceLevel}${
                publication.confidenceReason ? ` — ${publication.confidenceReason}` : ""
              }`}
            />
            <InfoItem
              label="Importado por"
              value={publication.importedBy?.name ?? "—"}
            />
            <InfoItem
              label="Status de revisão"
              value={publication.reviewStatus === "REVISADO" ? "Revisado" : "Não revisado"}
            />
            <InfoItem label="Revisor" value={publication.reviewer?.name ?? "—"} />
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p>{value}</p>
    </div>
  );
}

function PeStatusLabel({ status }: { status: string }) {
  const labels: Record<string, string> = {
    CONFIRMADO_PE: "Confirmado em Pernambuco",
    CONFIRMADO_OUTRO_ESTADO: "Confirmado em outro estado",
    NAO_CONFIRMADO_REVISAR: "LOCALIZAÇÃO NÃO CONFIRMADA — REVISAR",
    NAO_APLICAVEL: "Não aplicável",
  };
  return <span>{labels[status] ?? status}</span>;
}
