import Link from "next/link";

export function BarChart({
  rows,
}: {
  rows: { key: string; label: string; value: number; color: string; href?: string }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => {
        const widthPercent = Math.max(2, Math.round((row.value / max) * 100));
        const content = (
          <div className="flex items-center gap-3">
            <span className="w-40 shrink-0 truncate text-sm text-slate-600 dark:text-slate-300">
              {row.label}
            </span>
            <span className="h-4 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <span
                className="block h-4 rounded-full"
                style={{ width: `${widthPercent}%`, backgroundColor: row.color }}
              />
            </span>
            <span className="w-10 shrink-0 text-right text-sm font-medium tabular-nums text-slate-900 dark:text-slate-100">
              {row.value}
            </span>
          </div>
        );

        return row.href ? (
          <Link
            key={row.key}
            href={row.href}
            className="rounded-md px-1 py-0.5 hover:bg-slate-50 dark:hover:bg-slate-900"
            title={`${row.label}: ${row.value}`}
          >
            {content}
          </Link>
        ) : (
          <div key={row.key} className="px-1 py-0.5" title={`${row.label}: ${row.value}`}>
            {content}
          </div>
        );
      })}
      {rows.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">Sem dados ainda.</p>
      )}
    </div>
  );
}
