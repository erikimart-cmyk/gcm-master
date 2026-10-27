import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  isLoading: false,
  user: { id: "user-a" } as { id: string } | null,
  signOut: vi.fn(),
}));

vi.mock("@/features/auth/context/useAuth", () => ({
  useAuth: () => auth,
}));

vi.mock("../components/WelcomeHero", () => ({
  WelcomeHero: () => <div>Aprenda. Evolua. Conquiste.</div>,
}));

import { OnboardingPage } from "./OnboardingPage";

describe("OnboardingPage account control", () => {
  beforeEach(() => {
    auth.isLoading = false;
    auth.user = { id: "user-a" };
    auth.signOut.mockReset();
  });

  it("shows the account control on the journey screen when authenticated", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>,
    );
    expect(html).toContain("Aprenda. Evolua. Conquiste.");
    expect(html).toContain("Minha conta");
  });

  it("does not imply an active session without a user", () => {
    auth.user = null;
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>,
    );
    expect(html).toContain("Aprenda. Evolua. Conquiste.");
    expect(html).not.toContain("Minha conta");
    expect(html).not.toContain("Sair da conta");
  });
});
