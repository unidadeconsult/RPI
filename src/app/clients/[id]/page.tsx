import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      internalResponsible: true,
      clientProcesses: {
        include: { proceeding: { include: { trademarks: { include: { classes: true } } } } },
      },
      documents: true,
    },
  });

  if (!client) notFound();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <Link href="/clients" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Voltar aos clientes
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{client.name}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {client.personType === "PF" ? "Pessoa física" : "Pessoa jurídica"}
          {client.cpfCnpj && <> — {client.cpfCnpj}</>}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-900">
        <InfoItem label="Telefone" value={client.phone ?? "—"} />
        <InfoItem label="WhatsApp" value={client.whatsapp ?? "—"} />
        <InfoItem label="E-mail" value={client.email ?? "—"} />
        <InfoItem label="Endereço" value={client.address ?? "—"} />
        <InfoItem label="Responsável interno" value={client.internalResponsible?.name ?? "—"} />
        <InfoItem label="Observações" value={client.notes ?? "—"} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold">Processos e marcas relacionadas</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {client.clientProcesses.map((cp) => (
            <li
              key={cp.id}
              className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 dark:border-slate-800"
            >
              <div>
                <Link
                  href={`/proceedings/${cp.proceedingId}`}
                  className="font-medium text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
                >
                  {cp.proceeding.processNumber}
                </Link>
                {cp.proceeding.trademarks[0] && <> — {cp.proceeding.trademarks[0].name}</>}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {cp.proceeding.trademarks
                  .flatMap((t) => t.classes.map((c) => c.niceClass))
                  .join(", ") || "sem classe identificada"}
              </span>
            </li>
          ))}
          {client.clientProcesses.length === 0 && (
            <li className="text-slate-500 dark:text-slate-400">
              Nenhum processo vinculado a este cliente ainda.
            </li>
          )}
        </ul>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <p className="font-medium text-slate-700 dark:text-slate-300">Documentos</p>
          <p className="mt-1">
            {client.documents.length > 0
              ? `${client.documents.length} documento(s)`
              : "Nenhum documento — módulo de documentos ainda em construção."}
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <p className="font-medium text-slate-700 dark:text-slate-300">Histórico de contato</p>
          <p className="mt-1">Módulo de mensagens ainda em construção.</p>
        </div>
      </div>
    </main>
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
