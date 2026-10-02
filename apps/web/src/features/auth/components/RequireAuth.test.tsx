import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  user: null as { id: string } | null,
  isLoading: false,
  profileError: null as string | null,
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

describe("RequireAuth profile gate", () => {
  beforeEach(() => {
    auth.user = null;
    auth.isLoading = false;
    auth.profileError = null;
  });

  it("segura a área autenticada enquanto a sessão ou o profile ainda não assentaram", () => {
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

  it("mostra a falha do profile sem abrir a área autenticada", () => {
    auth.user = { id: "authenticated-user" };
    auth.profileError = "Não foi possível preparar seu perfil. Recarregue a página para tentar de novo.";

    const html = renderGuard();

    expect(html).toContain('role="alert"');
    expect(html).toContain(auth.profileError);
    expect(html).not.toContain("data-outlet");
    expect(html).not.toContain("data-redirect");
  });

  it("abre a área autenticada quando a sessão e o profile estão prontos", () => {
    auth.user = { id: "authenticated-user" };

    const html = renderGuard();

    expect(html).toContain('data-outlet="authenticated"');
    expect(html).not.toContain('role="alert"');
  });
});
