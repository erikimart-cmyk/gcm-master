import { describe, expect, it } from "vitest";

import {
  classifyPasswordResetRequestError,
  classifyPasswordUpdateError,
  isValidEmail,
  passwordRecoveryNeutralMessage,
  passwordRecoveryRateLimitMessage,
  passwordRecoverySessionRequiredMessage,
  passwordRecoverySuccessMessage,
  passwordsMatchPolicy,
  requestErrorMessage,
  shouldShowPasswordRecoveryUnauthorizedAlert,
} from "./passwordRecoveryActions";

describe("password recovery actions", () => {
  it("validates email and password confirmation", () => {
    expect(isValidEmail("invalido")).toBe(false);
    expect(isValidEmail("aluno@example.com")).toBe(true);
    expect(passwordsMatchPolicy("123", "123")).toContain("mínimo");
    expect(passwordsMatchPolicy("123456", "123457")).toContain("confirmação");
    expect(passwordsMatchPolicy("123456", "123456")).toBeNull();
  });

  it("hides account existence and surfaces rate limit or network failures", () => {
    expect(classifyPasswordResetRequestError(new Error("User not found"))).toBe("neutral");
    expect(requestErrorMessage("neutral")).toBe(passwordRecoveryNeutralMessage);
    expect(classifyPasswordResetRequestError(new Error("rate limit exceeded"))).toBe("rate-limit");
    expect(requestErrorMessage("rate-limit")).toBe(passwordRecoveryRateLimitMessage);
    expect(classifyPasswordResetRequestError(new Error("Failed to fetch"))).toBe("unavailable");
  });

  it("sanitizes expired or reused recovery sessions", () => {
    expect(classifyPasswordUpdateError(new Error("otp_expired"))).toBe(
      passwordRecoverySessionRequiredMessage,
    );
    expect(classifyPasswordUpdateError(new Error("invalid token"))).toBe(
      passwordRecoverySessionRequiredMessage,
    );
  });

  it("does not treat a confirmed success as an invalid recovery session", () => {
    expect(
      shouldShowPasswordRecoveryUnauthorizedAlert({
        isLoading: false,
        passwordRecovery: false,
        passwordRecoveryStatus: "consumed",
        outcome: "updated",
      }),
    ).toBe(false);
    expect(
      shouldShowPasswordRecoveryUnauthorizedAlert({
        isLoading: false,
        passwordRecovery: false,
        passwordRecoveryStatus: "idle",
        outcome: "sign-out-failed",
      }),
    ).toBe(false);
    expect(
      shouldShowPasswordRecoveryUnauthorizedAlert({
        isLoading: false,
        passwordRecovery: false,
        passwordRecoveryStatus: "consumed",
        outcome: "idle",
      }),
    ).toBe(true);
    expect(passwordRecoverySuccessMessage).toContain("Senha redefinida com sucesso");
  });
});
