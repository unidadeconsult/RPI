"use client";

import { useRouter } from "next/navigation";

export function EditionSelect({
  editions,
  selectedEditionId,
}: {
  editions: { id: string; number: string; versionLabel: number; publicationDate: Date }[];
  selectedEditionId: string;
}) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
      Edição
      <select
        name="rpiEditionId"
        defaultValue={selectedEditionId}
        onChange={(e) => router.push(`/reports/weekly?rpiEditionId=${e.target.value}`)}
        className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      >
        {editions.map((e) => (
          <option key={e.id} value={e.id}>
            RPI nº {e.number} (v{e.versionLabel}) — {e.publicationDate.toLocaleDateString("pt-BR")}
          </option>
        ))}
      </select>
    </label>
  );
}

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900"
    >
      Imprimir
    </button>
  );
}
