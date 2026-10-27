import type { PasswordRecoveryStatus } from "./passwordRecoveryGate";
import { recoveryOriginUnsafeMessage } from "./passwordRecoveryRedirect";

export const passwordRecoveryNeutralMessage =
  "Se houver uma conta para este e-mail, você receberá as instruções para redefinir sua senha.";

export const passwordRecoveryRateLimitMessage =
  "Não foi possível enviar agora. Tente novamente em alguns minutos.";

export const passwordRecoveryUnavailableMessage =
  "Não foi possível enviar as instruções. Tente novamente.";

export const passwordRecoverySessionRequiredMessage =
  "Este link de redefinição é inválido ou expirou. Solicite um novo.";

export const passwordRecoveryUnauthorizedMessage =
  "Não é possível redefinir a senha com a sessão atual. Solicite um novo link.";

export const passwordRecoveryUpdateFailedMessage =
  "Não foi possível atualizar a senha. Solicite um novo link.";

export const passwordRecoverySignOutFailedMessage =
  "A senha foi atualizada, mas não foi possível encerrar a sessão. Feche o navegador e entre novamente.";

export const passwordRecoverySuccessMessage =
  "Senha redefinida com sucesso! Você já pode entrar na ZYNVO com sua nova senha.";

export type PasswordRecoveryPageOutcome = "idle" | "updated" | "sign-out-failed";

export function shouldShowPasswordRecoveryUnauthorizedAlert(input: {
  isLoading: boolean;
  passwordRecovery: boolean;
  passwordRecoveryStatus: PasswordRecoveryStatus;
  outcome: PasswordRecoveryPageOutcome;
}): boolean {
  if (input.isLoading || input.passwordRecovery || input.outcome !== "idle") {
    return false;
  }

  return (
    input.passwordRecoveryStatus === "blocked" ||
    input.passwordRecoveryStatus === "idle" ||
    input.passwordRecoveryStatus === "path-isolated" ||
    input.passwordRecoveryStatus === "consumed"
  );
}

export const MIN_PASSWORD_LENGTH = 6;

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function passwordsMatchPolicy(password: string, confirmation: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  if (password !== confirmation) {
    return "A confirmação não confere com a nova senha.";
  }

  return null;
}

export function classifyPasswordResetRequestError(error: unknown): "neutral" | "rate-limit" | "unavailable" | "unsafe-origin" {
  if (!(error instanceof Error)) {
    return "unavailable";
  }

  const message = error.message.toLowerCase();

  if (message === recoveryOriginUnsafeMessage.toLowerCase() || message.includes("não está disponível neste ambiente")) {
    return "unsafe-origin";
  }

  if (message.includes("rate") || message.includes("429") || message.includes("too many")) {
    return "rate-limit";
  }

  if (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("timeout")
  ) {
    return "unavailable";
  }

  return "neutral";
}

export function requestErrorMessage(
  kind: ReturnType<typeof classifyPasswordResetRequestError>,
): string {
  if (kind === "rate-limit") {
    return passwordRecoveryRateLimitMessage;
  }

  if (kind === "unsafe-origin") {
    return recoveryOriginUnsafeMessage;
  }

  if (kind === "unavailable") {
    return passwordRecoveryUnavailableMessage;
  }

  return passwordRecoveryNeutralMessage;
}

export function classifyPasswordUpdateError(error: unknown): string {
  if (!(error instanceof Error)) {
    return passwordRecoveryUpdateFailedMessage;
  }

  const message = error.message.toLowerCase();

  if (
    message.includes("expired") ||
    message.includes("invalid") ||
    message.includes("otp") ||
    message.includes("reuse") ||
    message.includes("session")
  ) {
    return passwordRecoverySessionRequiredMessage;
  }

  return passwordRecoveryUpdateFailedMessage;
}
