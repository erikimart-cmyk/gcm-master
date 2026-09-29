import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  user: null as { id: string } | null,
  isLoading: false,
  configurationError: null as string | null,
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("../context/useAuth", () => ({
  useAuth: () => auth,
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    Navigate: ({ to, replace }: { to: string; replace?: boolean }) =>
      createElement("span", {
        "data-redirect": to,
        "data-replace": String(Boolean(replace)),
      }),
  };
});

import { AuthPage } from "./AuthPage";

function renderAuth(entry: string | { pathname: string; state?: { from?: string } }) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[entry]}>
      <AuthPage />
    </MemoryRouter>,
  );
}

describe("AuthPage session redirect", () => {
  beforeEach(() => {
    auth.user = null;
    auth.isLoading = false;
    auth.configurationError = null;
  });

  it("mantém /auth acessível sem sessão", () => {
    const html = renderAuth("/auth");

    expect(html).toContain("Entre na sua conta");
    expect(html).toContain("Ainda não tem uma conta? Crie agora");
    expect(html).not.toContain("data-redirect");
  });

  it("redireciona uma sessão existente para /onboarding", () => {
    auth.user = { id: "authenticated-user" };

    const html = renderAuth("/auth");

    expect(html).toContain('data-redirect="/onboarding"');
    expect(html).toContain('data-replace="true"');
    expect(html).not.toContain("Entre na sua conta");
  });

  it("preserva o destino anterior quando a sessão ainda existe", () => {
    auth.user = { id: "authenticated-user" };

    const html = renderAuth({
      pathname: "/auth",
      state: { from: "/dashboard" },
    });

    expect(html).toContain('data-redirect="/dashboard"');
  });
});
