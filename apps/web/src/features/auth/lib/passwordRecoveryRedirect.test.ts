import { describe, expect, it } from "vitest";

import {
  ALLOWED_PASSWORD_RECOVERY_ORIGINS,
  PASSWORD_RECOVERY_PATH,
  isPasswordRecoveryPath,
  resolvePasswordRecoveryRedirect,
} from "./passwordRecoveryRedirect";

describe("password recovery redirect", () => {
  it("builds a fixed reset path only for allowlisted origins", () => {
    expect(resolvePasswordRecoveryRedirect("http://127.0.0.1:5173")).toBe(
      "http://127.0.0.1:5173/auth/reset-password",
    );
    expect(resolvePasswordRecoveryRedirect("http://127.0.0.1:3000")).toBe(
      "http://127.0.0.1:3000/auth/reset-password",
    );
    expect(PASSWORD_RECOVERY_PATH).toBe("/auth/reset-password");
    expect(ALLOWED_PASSWORD_RECOVERY_ORIGINS).toContain("http://127.0.0.1:5173");
  });

  it("rejects missing, unknown, or arbitrary origins without fallback", () => {
    expect(resolvePasswordRecoveryRedirect(undefined)).toBeNull();
    expect(resolvePasswordRecoveryRedirect("https://evil.example")).toBeNull();
    expect(resolvePasswordRecoveryRedirect("http://127.0.0.1:5173/phish")).toBeNull();
    expect(resolvePasswordRecoveryRedirect("http://127.0.0.1:5173?next=1")).toBeNull();
  });

  it("identifies recovery paths", () => {
    expect(isPasswordRecoveryPath("/auth/reset-password")).toBe(true);
    expect(isPasswordRecoveryPath("/auth/forgot-password")).toBe(true);
    expect(isPasswordRecoveryPath("/dashboard")).toBe(false);
  });
});
