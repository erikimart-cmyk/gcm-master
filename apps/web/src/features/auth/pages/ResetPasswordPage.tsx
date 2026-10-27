import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../context/useAuth";
import type { PasswordRecoveryStatus } from "../lib/passwordRecoveryGate";
import {
  passwordRecoverySignOutFailedMessage,
  passwordRecoverySuccessMessage,
  passwordsMatchPolicy,
  shouldShowPasswordRecoveryUnauthorizedAlert,
  type PasswordRecoveryPageOutcome,
} from "../lib/passwordRecoveryActions";

export const passwordRecoveryUnauthorizedGuidance =
  "Não foi possível confirmar a autorização para redefinir sua senha. O link pode ter expirado, já ter sido utilizado ou a recuperação pode ter sido interrompida. Solicite um novo link para continuar com segurança.";

export type ResetPasswordViewProps = {
  configurationError: string | null;
  isLoading: boolean;
  passwordRecovery: boolean;
  passwordRecoveryStatus: PasswordRecoveryStatus;
  outcome: PasswordRecoveryPageOutcome;
  error: string | null;
  isSubmitting: boolean;
  password: string;
  confirmation: string;
  onPasswordChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ResetPasswordView({
  configurationError,
  isLoading,
  passwordRecovery,
  passwordRecoveryStatus,
  outcome,
  error,
  isSubmitting,
  password,
  confirmation,
  onPasswordChange,
  onConfirmationChange,
  onSubmit,
}: ResetPasswordViewProps) {
  const showUnauthorized =
    !error &&
    shouldShowPasswordRecoveryUnauthorizedAlert({
      isLoading,
      passwordRecovery,
      passwordRecoveryStatus,
      outcome,
    });
  const showRequestNewLink = outcome !== "updated";

  return (
    <main className="grid min-h-screen place-items-center bg-[#09090B] px-6 py-12 text-white">
      <section className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl shadow-black/30">
        <div className="flex flex-col items-start gap-6">
          {showRequestNewLink ? (
            <Link
              className="text-sm text-violet-300 transition hover:text-violet-200"
              to="/auth/forgot-password"
            >
              ← Solicitar um novo link
            </Link>
          ) : null}
          <span className="inline-flex rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-sm text-violet-200">
            ZYNVO
          </span>
        </div>
        <h1 className="mt-5 text-3xl font-bold">Redefinir senha</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Defina uma nova senha para a sua conta. O acesso aos estudos permanece bloqueado nesta etapa.
        </p>

        {configurationError ? (
          <p className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
            {configurationError}
          </p>
        ) : null}
        {isLoading ? (
          <p className="mt-6 text-sm text-zinc-400">Verificando o link de redefinição…</p>
        ) : null}
        {showUnauthorized ? (
          <p className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100" role="alert">
            {passwordRecoveryUnauthorizedGuidance}
          </p>
        ) : null}
        {error ? (
          <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100" role="alert">
            {error}
          </p>
        ) : null}
        {outcome === "updated" ? (
          <p className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100" role="status">
            {passwordRecoverySuccessMessage}{" "}
            <Link className="text-violet-200 underline" to="/auth">
              Voltar ao login
            </Link>
          </p>
        ) : null}
        {outcome === "sign-out-failed" ? (
          <p className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100" role="alert">
            {passwordRecoverySignOutFailedMessage}
          </p>
        ) : null}

        {passwordRecovery && outcome === "idle" ? (
          <form className="mt-8 space-y-5" onSubmit={onSubmit}>
            <label className="block text-sm font-medium text-zinc-200" htmlFor="new-password">
              Nova senha
              <input
                autoComplete="new-password"
                autoFocus
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-violet-400"
                id="new-password"
                minLength={6}
                onChange={(event) => onPasswordChange(event.target.value)}
                placeholder="Mínimo de 6 caracteres"
                required
                type="password"
                value={password}
              />
            </label>
            <label className="block text-sm font-medium text-zinc-200" htmlFor="confirm-password">
              Confirmar senha
              <input
                autoComplete="new-password"
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-violet-400"
                id="confirm-password"
                minLength={6}
                onChange={(event) => onConfirmationChange(event.target.value)}
                placeholder="Repita a nova senha"
                required
                type="password"
                value={confirmation}
              />
            </label>
            <button
              className="w-full rounded-xl bg-violet-600 px-4 py-3 font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-violet-900 disabled:text-zinc-400"
              disabled={Boolean(configurationError) || isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Aguarde…" : "Atualizar senha"}
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}

export function ResetPasswordPage() {
  const {
    configurationError,
    finishPasswordRecovery,
    isLoading,
    passwordRecovery,
    passwordRecoveryStatus,
    updatePasswordFromRecovery,
  } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<PasswordRecoveryPageOutcome>("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || outcome !== "idle" || !passwordRecovery) {
      return;
    }

    const policyError = passwordsMatchPolicy(password, confirmation);
    if (policyError) {
      setError(policyError);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await updatePasswordFromRecovery(password);
      setOutcome("updated");
      const finish = await finishPasswordRecovery();
      if (finish !== "signed-out") {
        setOutcome("sign-out-failed");
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : passwordRecoveryUnauthorizedGuidance,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ResetPasswordView
      configurationError={configurationError}
      confirmation={confirmation}
      error={error}
      isLoading={isLoading}
      isSubmitting={isSubmitting}
      onConfirmationChange={setConfirmation}
      onPasswordChange={setPassword}
      onSubmit={handleSubmit}
      outcome={outcome}
      password={password}
      passwordRecovery={passwordRecovery}
      passwordRecoveryStatus={passwordRecoveryStatus}
    />
  );
}
