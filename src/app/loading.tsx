export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center gap-3 px-6 py-20">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900 dark:border-slate-700 dark:border-t-slate-100"
        role="status"
        aria-label="Carregando"
      />
      <p className="text-sm text-slate-500 dark:text-slate-400">Carregando…</p>
    </main>
  );
}
