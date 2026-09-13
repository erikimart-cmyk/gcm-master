import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/useAuth";

type AuthLocationState = {
  from?: string;
  mode?: "sign-in" | "sign-up";
};

function getAuthErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Não foi possível concluir a autenticação. Tente novamente.";
  }

  if (error.message.toLowerCase().includes("invalid login")) {
    return "E-mail ou senha inválidos.";
  }

  if (error.message.toLowerCase().includes("already registered")) {
    return "Já existe uma conta com este e-mail. Entre para continuar.";
  }

  return error.message;
}

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { configurationError, isLoading, signIn, signUp, user } = useAuth();
  const locationState = location.state as AuthLocationState | null;
  const [mode, setMode] = useState<"sign-in" | "sign-up">(
    locationState?.mode ?? "sign-in",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = locationState?.from ?? "/onboarding";

  if (user) {
    return <Navigate replace to={redirectTo} />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === "sign-in") {
        await signIn({ email, password });
        navigate(redirectTo, { replace: true });
        return;
      }

      const result = await signUp({ email, password });

      if (result === "signed-in") {
        navigate(redirectTo, { replace: true });
        return;
      }

      setMessage(
        "Conta criada. Confira seu e-mail para confirmar o acesso e depois entre na ZYNVO.",
      );
    } catch (nextError) {
      setError(getAuthErrorMessage(nextError));
    } finally {
      setIsSubmitting(false);
    }
  }

  const isSignUp = mode === "sign-up";

  return (
    <main className="grid min-h-screen place-items-center bg-[#09090B] px-6 py-12 text-white">
      <section className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl shadow-black/30">
        <div className="flex flex-col items-start gap-6">
          <Link
            className="text-sm text-violet-300 transition hover:text-violet-200"
            to="/"
          >
            ← Voltar para a página inicial
          </Link>

          <span className="inline-flex rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-sm text-violet-200">
            ZYNVO
          </span>
        </div>
        <h1 className="mt-5 text-3xl font-bold">
          {isSignUp ? "Crie sua conta" : "Entre na sua conta"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          {isSignUp
            ? "Sua jornada e seu progresso ficarão associados somente a você."
            : "Continue sua jornada de estudos de onde parou."}
        </p>

        {configurationError ? (
          <p className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
            {configurationError}
          </p>
        ) : null}
        {error ? (
          <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
            {message}
          </p>
        ) : null}

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-zinc-200">
            E-mail
            <input
              autoComplete="email"
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-violet-400"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@exemplo.com"
              required
              type="email"
              value={email}
            />
          </label>

          <label className="block text-sm font-medium text-zinc-200">
            Senha
            <input
              autoComplete={isSignUp ? "new-password" : "current-password"}
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-violet-400"
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo de 6 caracteres"
              required
              type="password"
              value={password}
            />
          </label>

          <button
            className="w-full rounded-xl bg-violet-600 px-4 py-3 font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-violet-900 disabled:text-zinc-400"
            disabled={Boolean(configurationError) || isLoading || isSubmitting}
            type="submit"
          >
            {isSubmitting
              ? "Aguarde…"
              : isSignUp
                ? "Criar conta"
                : "Entrar"}
          </button>
        </form>

        <button
          className="mt-6 w-full text-sm text-zinc-400 transition hover:text-white"
          onClick={() => {
            setError(null);
            setMessage(null);
            setMode(isSignUp ? "sign-in" : "sign-up");
          }}
          type="button"
        >
          {isSignUp
            ? "Já tem uma conta? Entre"
            : "Ainda não tem uma conta? Crie agora"}
        </button>
      </section>
    </main>
  );
}
