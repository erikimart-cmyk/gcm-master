import { describe, expect, it } from "vitest";

import {
  createPasswordRecoveryGate,
  shouldSuppressAuthenticatedBootstrap,
} from "./passwordRecoveryGate";

describe("password recovery gate", () => {
  it("authorizes only PASSWORD_RECOVERY", () => {
    const gate = createPasswordRecoveryGate("/auth/reset-password");
    expect(gate.snapshot()).toBe("path-isolated");
    expect(gate.canUpdatePassword()).toBe(false);

    gate.handleEvent("SIGNED_IN", "/auth/reset-password");
    expect(gate.canUpdatePassword()).toBe(false);

    gate.handleEvent("TOKEN_REFRESHED", "/auth/reset-password");
    expect(gate.canUpdatePassword()).toBe(false);

    gate.handleEvent("INITIAL_SESSION", "/auth/reset-password");
    expect(gate.canUpdatePassword()).toBe(false);

    gate.handleEvent("PASSWORD_RECOVERY", "/auth/reset-password");
    expect(gate.snapshot()).toBe("authorized");
    expect(gate.canUpdatePassword()).toBe(true);
  });

  it("blocks a reload that has a session without PASSWORD_RECOVERY", () => {
    const gate = createPasswordRecoveryGate("/auth/reset-password");
    gate.handleEvent("INITIAL_SESSION", "/auth/reset-password");
    gate.finalizeInitialSession("/auth/reset-password", true);
    expect(gate.snapshot()).toBe("blocked");
    expect(gate.canUpdatePassword()).toBe(false);
  });

  it("invalidates after consume and blocks reuse", () => {
    const gate = createPasswordRecoveryGate("/auth/reset-password");
    gate.handleEvent("PASSWORD_RECOVERY", "/auth/reset-password");
    expect(gate.canUpdatePassword()).toBe(true);
    gate.consume();
    expect(gate.snapshot()).toBe("consumed");
    expect(gate.canUpdatePassword()).toBe(false);
    gate.handleEvent("PASSWORD_RECOVERY", "/auth/reset-password");
    expect(gate.snapshot()).toBe("blocked");
    expect(gate.canUpdatePassword()).toBe(false);
  });

  it("does not persist flags and resets on sign out", () => {
    const gate = createPasswordRecoveryGate("/auth/reset-password");
    gate.handleEvent("PASSWORD_RECOVERY", "/auth/reset-password");
    gate.handleEvent("SIGNED_OUT", "/auth");
    expect(gate.snapshot()).toBe("idle");
    expect(gate.canUpdatePassword()).toBe(false);
  });

  it("suppresses bootstrap on recovery paths before the event", () => {
    const gate = createPasswordRecoveryGate("/dashboard");
    expect(gate.suppressesBootstrap("/auth/reset-password")).toBe(true);
    expect(gate.snapshot()).toBe("path-isolated");
    const common = createPasswordRecoveryGate("/dashboard");
    expect(common.suppressesBootstrap("/dashboard")).toBe(false);
  });

  it("keeps suppressing bootstrap after invalidate while still on the reset path", () => {
    const resetPath = "/auth/reset-password";
    const gate = createPasswordRecoveryGate(resetPath);
    gate.handleEvent("PASSWORD_RECOVERY", resetPath);
    gate.consume();
    gate.handleEvent("SIGNED_OUT", resetPath);
    gate.invalidate();
    expect(gate.snapshot()).toBe("idle");
    expect(gate.canUpdatePassword()).toBe(false);
    expect(shouldSuppressAuthenticatedBootstrap(gate.snapshot(), resetPath)).toBe(true);
    expect(shouldSuppressAuthenticatedBootstrap("idle", "/auth")).toBe(false);
    expect(shouldSuppressAuthenticatedBootstrap("idle", "/dashboard")).toBe(false);
  });
});
