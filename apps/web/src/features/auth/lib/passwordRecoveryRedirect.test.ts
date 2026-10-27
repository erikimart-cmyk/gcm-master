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
    expect(resolvePasswordRecoveryRedirect("http://localhost:5173")).toBe(
      "http://localhost:5173/auth/reset-password",
    );
    expect(resolvePasswordRecoveryRedirect("http://127.0.0.1:5174")).toBe(
      "http://127.0.0.1:5174/auth/reset-password",
    );
    expect(resolvePasswordRecoveryRedirect("http://127.0.0.1:3000")).toBe(
      "http://127.0.0.1:3000/auth/reset-password",
    );
    expect(resolvePasswordRecoveryRedirect("https://zynvo-web.erikimart.workers.dev")).toBe(
      "https://zynvo-web.erikimart.workers.dev/auth/reset-password",
    );
    expect(PASSWORD_RECOVERY_PATH).toBe("/auth/reset-password");
    expect(ALLOWED_PASSWORD_RECOVERY_ORIGINS).toContain("http://127.0.0.1:5173");
    expect(ALLOWED_PASSWORD_RECOVERY_ORIGINS).toContain("http://127.0.0.1:5174");
    expect(ALLOWED_PASSWORD_RECOVERY_ORIGINS).toContain("https://zynvo-web.erikimart.workers.dev");
    expect(ALLOWED_PASSWORD_RECOVERY_ORIGINS).not.toContain("http://localhost:5174");
  });

  it("rejects missing, unknown, or arbitrary origins without fallback", () => {
    expect(resolvePasswordRecoveryRedirect(undefined)).toBeNull();
    expect(resolvePasswordRecoveryRedirect("")).toBeNull();
    expect(resolvePasswordRecoveryRedirect("not-a-url")).toBeNull();
    expect(resolvePasswordRecoveryRedirect("https://evil.example")).toBeNull();
    expect(resolvePasswordRecoveryRedirect("http://127.0.0.1:5173.evil.example")).toBeNull();
    expect(resolvePasswordRecoveryRedirect("ftp://127.0.0.1:5174")).toBeNull();
    expect(resolvePasswordRecoveryRedirect("http://localhost:5174")).toBeNull();
    expect(resolvePasswordRecoveryRedirect("http://127.0.0.1:5175")).toBeNull();
    expect(resolvePasswordRecoveryRedirect("http://127.0.0.1:5173/phish")).toBeNull();
    expect(resolvePasswordRecoveryRedirect("http://127.0.0.1:5173?next=1")).toBeNull();
    expect(resolvePasswordRecoveryRedirect("http://127.0.0.1:5173#token")).toBeNull();
    expect(resolvePasswordRecoveryRedirect("http://127.0.0.1:5174/auth/reset-password")).toBeNull();
    expect(resolvePasswordRecoveryRedirect("http://zynvo-web.erikimart.workers.dev")).toBeNull();
    expect(
      resolvePasswordRecoveryRedirect("https://zynvo-web.erikimart.workers.dev.evil.example"),
    ).toBeNull();
    expect(resolvePasswordRecoveryRedirect("https://outro.erikimart.workers.dev")).toBeNull();
    expect(resolvePasswordRecoveryRedirect("https://zynvo-web.erikimart.workers.dev:8443")).toBeNull();
    expect(resolvePasswordRecoveryRedirect("ftp://zynvo-web.erikimart.workers.dev")).toBeNull();
    expect(resolvePasswordRecoveryRedirect("https://zynvo-web.erikimart.workers.dev/other")).toBeNull();
    expect(resolvePasswordRecoveryRedirect("https://zynvo-web.erikimart.workers.dev?x=1")).toBeNull();
    expect(resolvePasswordRecoveryRedirect("https://zynvo-web.erikimart.workers.dev#fragment")).toBeNull();
    expect(
      resolvePasswordRecoveryRedirect("https://zynvo-web.erikimart.workers.dev/auth/reset-password"),
    ).toBeNull();
    expect(
      resolvePasswordRecoveryRedirect("https://user:pass@zynvo-web.erikimart.workers.dev"),
    ).toBeNull();
  });

  it("identifies recovery paths", () => {
    expect(isPasswordRecoveryPath("/auth/reset-password")).toBe(true);
    expect(isPasswordRecoveryPath("/auth/forgot-password")).toBe(true);
    expect(isPasswordRecoveryPath("/dashboard")).toBe(false);
  });
});
