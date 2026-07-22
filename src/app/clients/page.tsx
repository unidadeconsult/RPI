import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "./actions";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ proceedingId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { proceedingId } = await searchParams;
  const canEdit = session.user.role !== "CONSULTA";

  const [clients, proceeding] = await Promise.all([
    prisma.client.findMany({
      include: { _count: { select: { clientProcesses: true } }, internalResponsible: true },
      orderBy: { name: "asc" },
    }),
    proceedingId
      ? prisma.proceeding.findUnique({
          where: { id: proceedingId },
          include: { trademarks: true },
        })
      : null,
  ]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <Link href="/" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Voltar ao dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Clientes</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Carteira de clientes e vínculo com processos e marcas.
        </p>
      </header>

      {proceeding && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Vinculando o processo <strong>{proceeding.processNumber}</strong>
          {proceeding.trademarks[0] && <> ({proceeding.trademarks[0].name})</>} a um cliente.
          Cadastre um novo cliente abaixo ou volte e selecione um já existente.
        </div>
      )}

      {canEdit && (
        <section className="surface-card p-6">
          <h2 className="font-semibold">Novo cliente</h2>
          <form action={createClient} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {proceedingId && <input type="hidden" name="proceedingId" value={proceedingId} />}
            <TextField label="Nome" name="name" required />
            <label className="flex flex-col gap-1 text-sm">
              Tipo de pessoa
              <select
                name="personType"
                defaultValue="PF"
                className="field"
              >
                <option value="PF">Pessoa física</option>
                <option value="PJ">Pessoa jurídica</option>
              </select>
            </label>
            <TextField label="CPF ou CNPJ" name="cpfCnpj" />
            <TextField label="Telefone" name="phone" />
            <TextField label="WhatsApp" name="whatsapp" />
            <TextField label="E-mail" name="email" type="email" />
            <TextField label="Endereço" name="address" className="sm:col-span-2" />
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              Observações
              <textarea
                name="notes"
                rows={2}
                className="field"
              />
            </label>
            <button
              type="submit"
              className="self-start btn-primary sm:col-span-2"
            >
              Cadastrar cliente
            </button>
          </form>
        </section>
      )}

      <section className="overflow-x-auto surface-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Contato</th>
              <th className="px-4 py-3">Responsável interno</th>
              <th className="px-4 py-3">Processos</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                <td className="px-4 py-3">
                  <Link
                    href={`/clients/${client.id}`}
                    className="font-medium text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
                  >
                    {client.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{client.personType}</td>
                <td className="px-4 py-3">{client.email ?? client.phone ?? "—"}</td>
                <td className="px-4 py-3">{client.internalResponsible?.name ?? "—"}</td>
                <td className="px-4 py-3">{client._count.clientProcesses}</td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                  Nenhum cliente cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function TextField({
  label,
  name,
  type = "text",
  required = false,
  className = "",
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${className}`}>
      {label}
      <input
        type={type}
        name={name}
        required={required}
        className="field"
      />
    </label>
  );
}
