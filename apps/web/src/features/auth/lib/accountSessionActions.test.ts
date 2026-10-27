import { describe, expect, it, vi } from "vitest";

import { runAccountSignOut } from "./accountSessionActions";

describe("runAccountSignOut", () => {
  it("calls signOut once and reports success", async () => {
    const signOut = vi.fn().mockResolvedValueOnce(undefined);
    const onSuccess = vi.fn();
    await expect(
      runAccountSignOut({ signingOut: false, signOut, onSuccess }),
    ).resolves.toBe("signed-out");
    expect(signOut).toHaveBeenCalledOnce();
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("ignores duplicate attempts while signing out", async () => {
    const signOut = vi.fn();
    const onSuccess = vi.fn();
    await expect(
      runAccountSignOut({ signingOut: true, signOut, onSuccess }),
    ).resolves.toBe("ignored");
    expect(signOut).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("reports failure without success side effects", async () => {
    const signOut = vi.fn().mockRejectedValueOnce(new Error("auth sign out failed"));
    const onSuccess = vi.fn();
    await expect(
      runAccountSignOut({ signingOut: false, signOut, onSuccess }),
    ).resolves.toBe("failed");
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
