import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  user: { id: "user-a" } as { id: string } | null,
  suppressAuthenticatedBootstrap: false,
}));

const study = vi.hoisted(() => ({
  mounted: 0,
}));

vi.mock("./features/auth/context/useAuth", () => ({
  useAuth: () => auth,
}));

vi.mock("./features/landing/context/StudyProgressContext", () => ({
  StudyProgressProvider: ({ children }: { children: unknown }) => {
    study.mounted += 1;
    return createElement("div", { "data-study": "mounted" }, children as never);
  },
}));

vi.mock("./app/router/router", () => ({
  AppRouter: () => createElement("div", { "data-router": "yes" }),
}));

import { AppContent } from "./App";
import { shouldSuppressAuthenticatedBootstrap } from "./features/auth/lib/passwordRecoveryGate";

describe("App study isolation", () => {
  beforeEach(() => {
    auth.user = { id: "user-a" };
    auth.suppressAuthenticatedBootstrap = false;
    study.mounted = 0;
  });

  it("mounts study progress for a common session", () => {
    const html = renderToStaticMarkup(<AppContent />);
    expect(study.mounted).toBe(1);
    expect(html).toContain("data-study");
  });

  it("does not mount study progress during password recovery", () => {
    auth.suppressAuthenticatedBootstrap = true;
    const html = renderToStaticMarkup(<AppContent />);
    expect(study.mounted).toBe(0);
    expect(html).not.toContain("data-study");
    expect(html).toContain("data-router");
  });

  it("keeps the recovery router tree after a successful finish on the reset path", () => {
    expect(shouldSuppressAuthenticatedBootstrap("idle", "/auth/reset-password")).toBe(true);
    auth.suppressAuthenticatedBootstrap = true;
    const first = renderToStaticMarkup(<AppContent />);
    expect(study.mounted).toBe(0);
    expect(first).not.toContain("data-study");
    const second = renderToStaticMarkup(<AppContent />);
    expect(study.mounted).toBe(0);
    expect(second).not.toContain("data-study");
    expect(second).toContain("data-router");
  });
});
