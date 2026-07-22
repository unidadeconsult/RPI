"use client";

import type { ReactNode } from "react";

/**
 * Envolve um <form> de Server Action com uma confirmacao do navegador antes
 * de enviar (secao 30: "confirmacao antes de acoes sensiveis"). Usado apenas
 * para acoes dificeis de reverter (cancelar prazo/rascunho, confirmar envio
 * manual, desativar marca monitorada) -- nao para toda acao do sistema.
 */
export function ConfirmForm({
  action,
  confirmMessage,
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  confirmMessage: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </form>
  );
}
