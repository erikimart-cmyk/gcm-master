import { describe, expect, it } from "vitest";

import {
  createPasswordRecoveryGate,
  shouldSuppressAuthenticatedBootstrap,
} from "./passwordRecoveryGate";

const RESET = "/auth/reset-password";

function simulateProvider(pathname = RESET) {
  const gate = createPasswordRecoveryGate(pathname);
  return {
    gate,
    handle(event: string) {
      gate.handleEvent(event, pathname);
    },
    completeGetSession(hasSession: boolean) {
      gate.handleEvent("INITIAL_SESSION", pathname);
      gate.finalizeInitialSession(pathname, hasSession);
    },
  };
}

describe("password recovery session on original architecture", () => {
  it("authorizes only PASSWORD_RECOVERY", () => {
    const sim = simulateProvider();
    sim.handle("SIGNED_IN");
    sim.handle("TOKEN_REFRESHED");
    sim.completeGetSession(true);
    expect(sim.gate.canUpdatePassword()).toBe(false);
    sim.handle("PASSWORD_RECOVERY");
    expect(sim.gate.canUpdatePassword()).toBe(true);
  });

  it("blocks a persisted session after reload without PASSWORD_RECOVERY", () => {
    const sim = simulateProvider();
    sim.completeGetSession(true);
    expect(sim.gate.snapshot()).toBe("blocked");
    expect(sim.gate.canUpdatePassword()).toBe(false);
  });

  it("blocks remount with a persisted session and a new gate", () => {
    const first = simulateProvider();
    first.handle("PASSWORD_RECOVERY");
    expect(first.gate.canUpdatePassword()).toBe(true);

    const remount = simulateProvider();
    remount.completeGetSession(true);
    expect(remount.gate.canUpdatePassword()).toBe(false);
    expect(remount.gate.snapshot()).toBe("blocked");
  });

  it("does not restore authorization after consume even with a duplicate event", () => {
    const sim = simulateProvider();
    sim.handle("PASSWORD_RECOVERY");
    sim.gate.consume();
    sim.handle("PASSWORD_RECOVERY");
    expect(sim.gate.canUpdatePassword()).toBe(false);
    expect(sim.gate.snapshot()).toBe("blocked");
  });

  it("does not switch the study tree after a successful finish on the reset path", () => {
    const sim = simulateProvider();
    sim.handle("PASSWORD_RECOVERY");
    expect(shouldSuppressAuthenticatedBootstrap(sim.gate.snapshot(), RESET)).toBe(true);
    sim.gate.consume();
    sim.handle("SIGNED_OUT");
    sim.gate.invalidate();
    expect(sim.gate.canUpdatePassword()).toBe(false);
    expect(shouldSuppressAuthenticatedBootstrap(sim.gate.snapshot(), RESET)).toBe(true);
    expect(shouldSuppressAuthenticatedBootstrap(sim.gate.snapshot(), "/dashboard")).toBe(false);
  });
});
