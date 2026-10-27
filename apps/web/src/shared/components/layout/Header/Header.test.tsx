import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  user: { id: "user-a" } as { id: string } | null,
  signOut: vi.fn(),
}));

vi.mock("@/features/auth/context/useAuth", () => ({
  useAuth: () => auth,
}));

import {
  accountSignOutFailedMessage,
  runAccountSignOut,
} from "@/features/auth/lib/accountSessionActions";

import { Header, HeaderSessionControl } from "./Header";

function renderHeader() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );
}

describe("Header logout", () => {
  beforeEach(() => {
    auth.user = { id: "user-a" };
    auth.signOut.mockReset();
  });

  it("shows Sair on desktop and mobile when authenticated", () => {
    const html = renderHeader();
    expect(html).toContain("Sair");
    expect(html).toContain("hidden sm:block");
    expect(html).toContain("sm:hidden");
    expect(html.split("Sair").length - 1).toBe(2);
    expect(html).toContain("Planos");
    expect(html).toContain('href="/planos"');
    expect(html).toContain("Início");
    expect(html).toContain("Recursos");
    expect(html).not.toContain("Entrar");
  });

  it("shows Entrar instead of Sair when signed out", () => {
    auth.user = null;
    const html = renderHeader();
    expect(html).toContain("Entrar");
    expect(html).toContain('href="/auth"');
    expect(html).not.toContain("Sair");
    expect(html).toContain("Planos");
  });

  it("calls the existing signOut once and navigates to public login", async () => {
    const signOut = vi.fn().mockResolvedValueOnce(undefined);
    const navigate = vi.fn();
    await expect(
      runAccountSignOut({
        signingOut: false,
        signOut,
        onSuccess: () => navigate("/auth", { replace: true }),
      }),
    ).resolves.toBe("signed-out");
    expect(signOut).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith("/auth", { replace: true });
  });

  it("ignores a second sign-out while the first is in progress", async () => {
    const signOut = vi.fn();
    const navigate = vi.fn();
    await expect(
      runAccountSignOut({
        signingOut: true,
        signOut,
        onSuccess: () => navigate("/auth", { replace: true }),
      }),
    ).resolves.toBe("ignored");
    expect(signOut).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("does not navigate when signOut fails", async () => {
    const signOut = vi.fn().mockRejectedValueOnce(new Error("auth sign out failed"));
    const navigate = vi.fn();
    await expect(
      runAccountSignOut({
        signingOut: false,
        signOut,
        onSuccess: () => navigate("/auth", { replace: true }),
      }),
    ).resolves.toBe("failed");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("exposes processing state and blocks repeated activation", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <HeaderSessionControl
          error={null}
          onSignOut={() => undefined}
          signingOut
          user={{ id: "user-a" }}
        />
      </MemoryRouter>,
    );
    expect(html).toContain("Saindo…");
    expect(html).toContain("disabled");
    expect(html).toContain('aria-busy="true"');
  });

  it("shows failure feedback without claiming success", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <HeaderSessionControl
          error={accountSignOutFailedMessage}
          onSignOut={() => undefined}
          signingOut={false}
          user={{ id: "user-a" }}
        />
      </MemoryRouter>,
    );
    expect(html).toContain(accountSignOutFailedMessage);
    expect(html).toContain('role="alert"');
    expect(html).toContain("Sair");
    expect(html).not.toContain("/auth");
  });
});
