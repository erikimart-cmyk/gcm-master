import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authApi = vi.hoisted(() => ({
  signOut: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
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

const resetAction = vi.hoisted(() => ({
  onClick: undefined as undefined | (() => void | Promise<unknown>),
}));

const updateAction = vi.hoisted(() => ({
  onClick: undefined as undefined | (() => void | Promise<unknown>),
}));

vi.mock("../lib/supabase", () => ({
  getSupabaseClient: () => ({
    auth: {
      signOut: authApi.signOut,
      signInWithPassword: authApi.signInWithPassword,
      signUp: authApi.signUp,
      resetPasswordForEmail: authApi.resetPasswordForEmail,
      updateUser: authApi.updateUser,
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  }),
  supabaseConfigurationMessage: "unconfigured",
}));

vi.mock("react/jsx-dev-runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react/jsx-dev-runtime")>();

  return {
    ...actual,
    jsxDEV: (...args: Parameters<typeof actual.jsxDEV>) => {
      captureAction(
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
      captureAction(
        args[1] as { children?: unknown; onClick?: () => void | Promise<void> } | null,
      );
      return actual.jsx(...args);
    },
    jsxs: (...args: Parameters<typeof actual.jsxs>) => {
      captureAction(
        args[1] as { children?: unknown; onClick?: () => void | Promise<void> } | null,
      );
      return actual.jsxs(...args);
    },
  };
});

import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./useAuth";

function captureAction(
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

  if (props?.children === "reset-probe") {
    resetAction.onClick = props.onClick;
  }

  if (props?.children === "update-probe") {
    updateAction.onClick = props.onClick;
  }
}

function Probe() {
  const { requestPasswordReset, signIn, signOut, signUp, updatePasswordFromRecovery } = useAuth();

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
      <button
        onClick={() => requestPasswordReset("student@example.com")}
        type="button"
      >
        reset-probe
      </button>
      <button
        onClick={() => updatePasswordFromRecovery("password-1")}
        type="button"
      >
        update-probe
      </button>
    </>
  );
}

describe("AuthProvider original session plus recovery", () => {
  beforeEach(() => {
    authApi.signOut.mockReset();
    authApi.signInWithPassword.mockReset();
    authApi.signUp.mockReset();
    authApi.resetPasswordForEmail.mockReset();
    authApi.updateUser.mockReset();
    storage.removeItem.mockReset();
    storage.clear.mockReset();
    storage.getItem.mockReset();
    storage.setItem.mockReset();
    vi.stubGlobal("localStorage", storage);
    signOutAction.onClick = undefined;
    signInAction.onClick = undefined;
    signUpAction.onClick = undefined;
    resetAction.onClick = undefined;
    updateAction.onClick = undefined;
    renderToStaticMarkup(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
  });

  it("encerra a sessão pelo supabase.auth.signOut sem limpar storage", async () => {
    authApi.signOut.mockResolvedValueOnce({ error: null });

    await signOutAction.onClick?.();

    expect(authApi.signOut).toHaveBeenCalledOnce();
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(storage.clear).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("propaga a falha do signOut oficial", async () => {
    const failure = new Error("auth sign out failed");
    authApi.signOut.mockResolvedValueOnce({ error: failure });

    await expect(signOutAction.onClick?.()).rejects.toBe(failure);
  });

  it("entra com a sessão oficial", async () => {
    authApi.signInWithPassword.mockResolvedValueOnce({ error: null });

    await signInAction.onClick?.();

    expect(authApi.signInWithPassword).toHaveBeenCalledOnce();
    expect(authApi.signInWithPassword).toHaveBeenCalledWith({
      email: "student@example.com",
      password: "password-1",
    });
  });

  it("cadastro com confirmação não cria sessão local", async () => {
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
    vi.unstubAllGlobals();
  });

  it("requests recovery with a fixed redirect", async () => {
    vi.stubEnv("VITE_PASSWORD_RECOVERY_ORIGIN", "http://127.0.0.1:5173");
    authApi.resetPasswordForEmail.mockResolvedValueOnce({ error: null });

    await resetAction.onClick?.();

    expect(authApi.resetPasswordForEmail).toHaveBeenCalledWith("student@example.com", {
      redirectTo: "http://127.0.0.1:5173/auth/reset-password",
    });
  });

  it("requests recovery with the local 5174 origin", async () => {
    vi.stubEnv("VITE_PASSWORD_RECOVERY_ORIGIN", "http://127.0.0.1:5174");
    authApi.resetPasswordForEmail.mockResolvedValueOnce({ error: null });

    await resetAction.onClick?.();

    expect(authApi.resetPasswordForEmail).toHaveBeenCalledWith("student@example.com", {
      redirectTo: "http://127.0.0.1:5174/auth/reset-password",
    });
  });

  it("requests recovery with the production HTTPS origin", async () => {
    vi.stubEnv("VITE_PASSWORD_RECOVERY_ORIGIN", "https://zynvo-web.erikimart.workers.dev");
    authApi.resetPasswordForEmail.mockResolvedValueOnce({ error: null });

    await resetAction.onClick?.();

    expect(authApi.resetPasswordForEmail).toHaveBeenCalledWith("student@example.com", {
      redirectTo: "https://zynvo-web.erikimart.workers.dev/auth/reset-password",
    });
  });

  it("blocks recovery when the origin is not allowlisted", async () => {
    vi.stubEnv("VITE_PASSWORD_RECOVERY_ORIGIN", "https://evil.example");
    await expect(resetAction.onClick?.()).rejects.toThrow("não está disponível neste ambiente");
    expect(authApi.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("blocks recovery when the origin is missing", async () => {
    vi.stubEnv("VITE_PASSWORD_RECOVERY_ORIGIN", "");
    await expect(resetAction.onClick?.()).rejects.toThrow("não está disponível neste ambiente");
    expect(authApi.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("does not call updateUser without PASSWORD_RECOVERY", async () => {
    await expect(updateAction.onClick?.()).rejects.toThrow();
    expect(authApi.updateUser).not.toHaveBeenCalled();
  });

  it("does not treat SIGNED_IN as password recovery authorization", async () => {
    authApi.updateUser.mockResolvedValueOnce({ error: null });
    await expect(updateAction.onClick?.()).rejects.toThrow();
    expect(authApi.updateUser).not.toHaveBeenCalled();
  });
});
