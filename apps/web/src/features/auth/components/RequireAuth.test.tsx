import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  user: null as { id: string } | null,
  isLoading: false,
  passwordRecovery: false,
}));

vi.mock("../context/useAuth", () => ({
  useAuth: () => auth,
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();

  return {
    ...actual,
    Navigate: ({ to }: { to: string }) =>
      createElement("span", { "data-redirect": to }),
    Outlet: () => createElement("span", { "data-outlet": "authenticated" }),
  };
});

import { RequireAuth } from "./RequireAuth";

function renderGuard() {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={["/revisao/questoes"]}>
      <RequireAuth />
    </MemoryRouter>,
  );
}

describe("RequireAuth", () => {
  beforeEach(() => {
    auth.user = null;
    auth.isLoading = false;
    auth.passwordRecovery = false;
  });

  it("segura a área autenticada enquanto a sessão ainda não assentou", () => {
    auth.user = { id: "authenticated-user" };
    auth.isLoading = true;

    const html = renderGuard();

    expect(html).toContain("Verificando sua sessão…");
    expect(html).not.toContain("data-outlet");
    expect(html).not.toContain("data-redirect");
  });

  it("redireciona quem não está autenticado", () => {
    const html = renderGuard();

    expect(html).toContain('data-redirect="/auth"');
    expect(html).not.toContain("data-outlet");
  });

  it("abre a área autenticada quando há sessão comum", () => {
    auth.user = { id: "authenticated-user" };

    const html = renderGuard();

    expect(html).toContain('data-outlet="authenticated"');
  });

  it("keeps recovery sessions out of pedagogical routes", () => {
    auth.user = { id: "authenticated-user" };
    auth.passwordRecovery = true;

    const html = renderGuard();

    expect(html).toContain('data-redirect="/auth/reset-password"');
    expect(html).not.toContain("data-outlet");
  });
});
