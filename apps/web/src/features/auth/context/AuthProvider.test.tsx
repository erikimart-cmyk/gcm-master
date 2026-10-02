import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authApi = vi.hoisted(() => ({
  signOut: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
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

const signInAction = vi.hoisted(() => ({
  onClick: undefined as undefined | (() => void | Promise<void>),
}));

const signUpAction = vi.hoisted(() => ({
  onClick: undefined as undefined | (() => void | Promise<unknown>),
}));

vi.mock("../lib/supabase", () => ({
  getSupabaseClient: () => ({
    auth: {
      signOut: authApi.signOut,
      signInWithPassword: authApi.signInWithPassword,
      signUp: authApi.signUp,
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
  props: { children?: unknown; onClick?: () => void | Promise<unknown> } | null,
) {
  if (props?.children === "sign-out-probe") {
    signOutAction.onClick = props.onClick as (() => void | Promise<void>) | undefined;
  }

  if (props?.children === "sign-in-probe") {
    signInAction.onClick = props.onClick as (() => void | Promise<void>) | undefined;
  }

  if (props?.children === "sign-up-probe") {
    signUpAction.onClick = props.onClick;
  }
}

function Probe() {
  const { signIn, signOut, signUp } = useAuth();

  return (
    <>
      <button onClick={() => signOut()} type="button">
        sign-out-probe
      </button>
      <button
        onClick={() => signIn({ email: "student@example.com", password: "password-1" })}
        type="button"
      >
        sign-in-probe
      </button>
      <button
        onClick={() => signUp({ email: "student@example.com", password: "password-1" })}
        type="button"
      >
        sign-up-probe
      </button>
    </>
  );
}

describe("AuthProvider signOut", () => {
  beforeEach(() => {
    authApi.signOut.mockReset();
    authApi.signInWithPassword.mockReset();
    authApi.signUp.mockReset();
    authApi.from.mockReset();
    storage.removeItem.mockReset();
    storage.clear.mockReset();
    storage.getItem.mockReset();
    storage.setItem.mockReset();
    vi.stubGlobal("localStorage", storage);
    signOutAction.onClick = undefined;
    signInAction.onClick = undefined;
    signUpAction.onClick = undefined;
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

  it("entra com a sessão oficial sem gravar profile dentro do login", async () => {
    authApi.signInWithPassword.mockResolvedValueOnce({ error: null });

    await signInAction.onClick?.();

    expect(authApi.signInWithPassword).toHaveBeenCalledOnce();
    expect(authApi.signInWithPassword).toHaveBeenCalledWith({
      email: "student@example.com",
      password: "password-1",
    });
    expect(authApi.from).not.toHaveBeenCalled();
  });

  it("cadastro com confirmação não cria profile nem sessão local", async () => {
    vi.stubGlobal("window", { location: { origin: "https://app.test" } });
    authApi.signUp.mockResolvedValueOnce({
      data: { session: null, user: { id: "pending-user" } },
      error: null,
    });

    await expect(signUpAction.onClick?.()).resolves.toBe("confirmation-required");
    expect(authApi.signUp).toHaveBeenCalledWith({
      email: "student@example.com",
      password: "password-1",
      options: { emailRedirectTo: "https://app.test/auth" },
    });
    expect(authApi.from).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
