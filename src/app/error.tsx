"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <p className="text-lg font-semibold">Não foi possível concluir esta ação</p>
      <p className="text-sm text-slate-600 dark:text-slate-300">{error.message}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="btn-primary"
        >
          Tentar novamente
        </button>
        <Link
          href="/"
          className="btn-secondary"
        >
          Voltar ao dashboard
        </Link>
      </div>
    </main>
  );
}
