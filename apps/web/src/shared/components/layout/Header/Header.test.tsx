import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  user: { id: "authenticated-user" } as { id: string } | null,
  signOut: vi.fn<() => Promise<void>>(),
}));

const navigate = vi.hoisted(() => vi.fn());

const signOutAction = vi.hoisted(() => ({
  onClick: undefined as undefined | (() => void | Promise<void>),
}));

vi.mock("@/features/auth/context/useAuth", () => ({
  useAuth: () => ({
    user: auth.user,
    signOut: auth.signOut,
  }),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock("react/jsx-dev-runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react/jsx-dev-runtime")>();

  return {
    ...actual,
    jsxDEV: (...args: Parameters<typeof actual.jsxDEV>) => {
      captureSignOut(
        args[1] as { children?: unknown; onClick?: () => void | Promise<void> } | null,
      );
      return actual.jsxDEV(...args);
    },
  };
});

vi.mock("react/jsx-runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react/jsx-runtime")>();

  return {
    ...actual,
    jsx: (...args: Parameters<typeof actual.jsx>) => {
      captureSignOut(
        args[1] as { children?: unknown; onClick?: () => void | Promise<void> } | null,
      );
      return actual.jsx(...args);
    },
    jsxs: (...args: Parameters<typeof actual.jsxs>) => {
      captureSignOut(
        args[1] as { children?: unknown; onClick?: () => void | Promise<void> } | null,
      );
      return actual.jsxs(...args);
    },
  };
});

import { Header } from "./Header";

function captureSignOut(
  props: { children?: unknown; onClick?: () => void | Promise<void> } | null,
) {
  if (props?.children === "Sair") {
    signOutAction.onClick = props.onClick;
  }
}

function renderHeader() {
  signOutAction.onClick = undefined;
  return renderToStaticMarkup(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );
}

describe("Header logout existente", () => {
  beforeEach(() => {
    auth.user = { id: "authenticated-user" };
    auth.signOut.mockReset();
    auth.signOut.mockResolvedValue(undefined);
    navigate.mockReset();
  });

  it("continua oferecendo Sair e encerrando a sessão antes de voltar ao início", async () => {
    const html = renderHeader();

    expect(html).toContain(">Sair<");
    await signOutAction.onClick?.();

    expect(auth.signOut).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("mostra Entrar quando não há sessão", () => {
    auth.user = null;

    const html = renderHeader();

    expect(html).toContain('href="/auth"');
    expect(html).toContain(">Entrar<");
    expect(html).not.toContain(">Sair<");
  });
});
