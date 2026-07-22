"use client";

import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("E-mail ou senha inválidos.");
      return;
    }

    window.location.href = callbackUrl;
  }

  return (
    <div className="enter relative z-10 w-full max-w-sm">
      <div className="mb-7 flex flex-col items-center gap-3 text-center">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-semibold"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          RPI
        </div>
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--ink)" }}>
            RPI Manager
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-secondary)" }}>
            Gestão semanal da RPI — seção de Marcas
          </p>
        </div>
      </div>

      <div className="surface-card px-7 py-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--ink-secondary)" }}>
            E-mail
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="field"
              autoComplete="email"
              autoFocus
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--ink-secondary)" }}>
            Senha
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field"
              autoComplete="current-password"
            />
          </label>

          {error && (
            <p
              className="rounded-lg px-3 py-2 text-sm"
              style={{ background: "var(--critical-soft)", color: "var(--critical)" }}
              role="alert"
            >
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary mt-1 w-full disabled:opacity-60">
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-xs" style={{ color: "var(--ink-muted)" }}>
        Unidade Consult · Ferramenta de apoio operacional
      </p>
    </div>
  );
}
