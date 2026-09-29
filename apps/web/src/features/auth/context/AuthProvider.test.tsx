import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authApi = vi.hoisted(() => ({
  signOut: vi.fn(),
  from: vi.fn(),
}));

const storage = vi.hoisted(() => ({
  removeItem: vi.fn(),
  clear: vi.fn(),
  getItem: vi.fn(),
  setItem: vi.fn(),
}));

const signOutAction = vi.hoisted(() => ({
  onClick: undefined as undefined | (() => void | Promise<void>),
}));

vi.mock("../lib/supabase", () => ({
  getSupabaseClient: () => ({
    auth: {
      signOut: authApi.signOut,
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: authApi.from,
  }),
  supabaseConfigurationMessage: "unconfigured",
}));

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

import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./useAuth";

function captureSignOut(
  props: { children?: unknown; onClick?: () => void | Promise<void> } | null,
) {
  if (props?.children === "sign-out-probe") {
    signOutAction.onClick = props.onClick;
  }
}

function Probe() {
  const { signOut } = useAuth();

  return (
    <button onClick={() => signOut()} type="button">
      sign-out-probe
    </button>
  );
}

describe("AuthProvider signOut", () => {
  beforeEach(() => {
    authApi.signOut.mockReset();
    authApi.from.mockReset();
    storage.removeItem.mockReset();
    storage.clear.mockReset();
    storage.getItem.mockReset();
    storage.setItem.mockReset();
    vi.stubGlobal("localStorage", storage);
    signOutAction.onClick = undefined;
    renderToStaticMarkup(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
  });

  it("encerra a sessão pelo supabase.auth.signOut sem gravar estudo nem limpar storage", async () => {
    authApi.signOut.mockResolvedValueOnce({ error: null });

    await signOutAction.onClick?.();

    expect(authApi.signOut).toHaveBeenCalledOnce();
    expect(authApi.signOut).toHaveBeenCalledWith();
    expect(authApi.from).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(storage.clear).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("propaga a falha do signOut oficial sem consultar study_goals ou user_study_tracks", async () => {
    const failure = new Error("auth sign out failed");
    authApi.signOut.mockResolvedValueOnce({ error: failure });

    await expect(signOutAction.onClick?.()).rejects.toBe(failure);
    expect(authApi.from).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(storage.clear).not.toHaveBeenCalled();
  });
});
