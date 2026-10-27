import { isPasswordRecoveryPath } from "./passwordRecoveryRedirect";

export type PasswordRecoveryStatus =
  | "idle"
  | "path-isolated"
  | "authorized"
  | "consumed"
  | "blocked";

export function shouldSuppressAuthenticatedBootstrap(
  status: PasswordRecoveryStatus,
  pathname: string,
): boolean {
  return (
    isPasswordRecoveryPath(pathname) ||
    status === "authorized" ||
    status === "path-isolated" ||
    status === "blocked" ||
    status === "consumed"
  );
}

export function createPasswordRecoveryGate(initialPathname = "") {
  let status: PasswordRecoveryStatus = isPasswordRecoveryPath(initialPathname)
    ? "path-isolated"
    : "idle";

  function observePath(pathname: string) {
    if (status === "authorized" || status === "consumed" || status === "blocked") {
      return;
    }

    if (isPasswordRecoveryPath(pathname)) {
      status = "path-isolated";
    }
  }

  return {
    snapshot(): PasswordRecoveryStatus {
      return status;
    },
    observePath,
    suppressesBootstrap(pathname: string): boolean {
      observePath(pathname);
      return (
        isPasswordRecoveryPath(pathname) ||
        status === "authorized" ||
        status === "consumed" ||
        status === "blocked" ||
        status === "path-isolated"
      );
    },
    handleEvent(event: string, pathname: string) {
      observePath(pathname);

      if (event === "PASSWORD_RECOVERY") {
        status = status === "consumed" ? "blocked" : "authorized";
        return;
      }

      if (event === "SIGNED_OUT") {
        status = "idle";
        observePath(pathname);
      }
    },
    finalizeInitialSession(pathname: string, hasSession: boolean) {
      observePath(pathname);

      if (pathname !== "/auth/reset-password") {
        return;
      }

      if (hasSession && status !== "authorized") {
        status = "blocked";
      }
    },
    canUpdatePassword() {
      return status === "authorized";
    },
    consume() {
      if (status === "authorized") {
        status = "consumed";
      }
    },
    invalidate() {
      status = status === "blocked" ? "blocked" : "idle";
    },
    block() {
      status = "blocked";
    },
  };
}

export type PasswordRecoveryGate = ReturnType<typeof createPasswordRecoveryGate>;
