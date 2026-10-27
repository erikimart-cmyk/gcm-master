import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../context/useAuth";
import {
  classifyPasswordResetRequestError,
  isValidEmail,
  passwordRecoveryNeutralMessage,
  requestErrorMessage,
} from "../lib/passwordRecoveryActions";

export function ForgotPasswordPage() {
  const { configurationError, isLoading, requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || completed) {
      return;
    }

    setError(null);

    if (!isValidEmail(email)) {
      setError("Informe um e-mail válido.");
      return;
    }

    setIsSubmitting(true);

    try {
      await requestPasswordReset(email);
      setCompleted(true);
    } catch (nextError) {
      const kind = classifyPasswordResetRequestError(nextError);
      if (kind === "neutral") {
        setCompleted(true);
      } else {
        setError(requestErrorMessage(kind));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#09090B] px-6 py-12 text-white">
      <section className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl shadow-black/30">
        <div className="flex flex-col items-start gap-6">
          <Link
            className="text-sm text-violet-300 transition hover:text-violet-200"
            to="/auth"
          >
            ← Voltar para o login
          </Link>
          <span className="inline-flex rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-sm text-violet-200">
            ZYNVO
          </span>
        </div>
        <h1 className="mt-5 text-3xl font-bold">Esqueci minha senha</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Informe o e-mail da sua conta. Se ele estiver cadastrado, enviaremos as instruções.
        </p>

        {configurationError ? (
          <p className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
            {configurationError}
          </p>
        ) : null}
        {error ? (
          <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100" role="alert">
            {error}
          </p>
        ) : null}
        {completed ? (
          <p className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100" role="status">
            {passwordRecoveryNeutralMessage}
          </p>
        ) : null}

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-zinc-200" htmlFor="forgot-email">
            E-mail
            <input
              autoComplete="email"
              autoFocus
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-violet-400"
              disabled={completed || isSubmitting}
              id="forgot-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@exemplo.com"
              required
              type="email"
              value={email}
            />
          </label>

          <button
            className="w-full rounded-xl bg-violet-600 px-4 py-3 font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-violet-900 disabled:text-zinc-400"
            disabled={Boolean(configurationError) || isLoading || isSubmitting || completed}
            type="submit"
          >
            {isSubmitting ? "Aguarde…" : "Enviar instruções"}
          </button>
        </form>
      </section>
    </main>
  );
}
