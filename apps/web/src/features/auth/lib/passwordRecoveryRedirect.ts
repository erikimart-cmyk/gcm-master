export const PASSWORD_RECOVERY_PATH = "/auth/reset-password";
export const FORGOT_PASSWORD_PATH = "/auth/forgot-password";

export const ALLOWED_PASSWORD_RECOVERY_ORIGINS = [
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:3000",
  "https://zynvo-web.erikimart.workers.dev",
] as const;

export const recoveryOriginUnsafeMessage =
  "A redefinição de senha não está disponível neste ambiente.";

export function isPasswordRecoveryPath(pathname: string): boolean {
  return pathname === PASSWORD_RECOVERY_PATH || pathname === FORGOT_PASSWORD_PATH;
}

export function readConfiguredRecoveryOrigin(
  env: Record<string, unknown> = import.meta.env as Record<string, unknown>,
): string | undefined {
  const value = env.VITE_PASSWORD_RECOVERY_ORIGIN;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function resolvePasswordRecoveryRedirect(
  configuredOrigin: string | undefined,
): string | null {
  if (!configuredOrigin) {
    return null;
  }

  const origin = configuredOrigin.replace(/\/$/, "");

  if (!(ALLOWED_PASSWORD_RECOVERY_ORIGINS as readonly string[]).includes(origin)) {
    return null;
  }

  if (!/^https?:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(origin)) {
    return null;
  }

  return `${origin}${PASSWORD_RECOVERY_PATH}`;
}
