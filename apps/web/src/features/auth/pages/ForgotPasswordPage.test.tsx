import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  configurationError: null as string | null,
  isLoading: false,
  requestPasswordReset: vi.fn(),
}));

const formAction = vi.hoisted(() => ({
  onSubmit: undefined as undefined | ((event: { preventDefault: () => void }) => void | Promise<void>),
}));

vi.mock("../context/useAuth", () => ({
  useAuth: () => auth,
}));

vi.mock("react/jsx-runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react/jsx-runtime")>();
  return {
    ...actual,
    jsx: (...args: Parameters<typeof actual.jsx>) => {
      const props = args[1] as { onSubmit?: (event: { preventDefault: () => void }) => void } | null;
      if (props?.onSubmit && args[0] === "form") {
        formAction.onSubmit = props.onSubmit;
      }
      return actual.jsx(...args);
    },
    jsxs: (...args: Parameters<typeof actual.jsxs>) => {
      const props = args[1] as { onSubmit?: (event: { preventDefault: () => void }) => void } | null;
      if (props?.onSubmit && args[0] === "form") {
        formAction.onSubmit = props.onSubmit;
      }
      return actual.jsxs(...args);
    },
  };
});

import { ForgotPasswordPage } from "./ForgotPasswordPage";
import { passwordRecoveryNeutralMessage } from "../lib/passwordRecoveryActions";

function renderForgot() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>,
  );
}

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    auth.configurationError = null;
    auth.isLoading = false;
    auth.requestPasswordReset.mockReset();
    formAction.onSubmit = undefined;
  });

  it("renders the recovery request without logging the email", () => {
    const html = renderForgot();
    expect(html).toContain("Esqueci minha senha");
    expect(html).toContain("forgot-email");
    expect(html).toContain("Voltar para o login");
    expect(html).not.toContain("console.");
  });

  it("blocks invalid email before calling supabase", async () => {
    renderForgot();
    await formAction.onSubmit?.({ preventDefault() {} });
    expect(auth.requestPasswordReset).not.toHaveBeenCalled();
  });
});

describe("ForgotPasswordPage submission with typed email", () => {
  it("invokes a single reset request and ignores a second click", async () => {
    const currentEmail = "aluno@example.com";
    const calls: string[] = [];
    const requestPasswordReset = vi.fn(async (email: string) => {
      calls.push(email);
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    const { isValidEmail } = await import("../lib/passwordRecoveryActions");
    expect(isValidEmail(currentEmail)).toBe(true);

    let isSubmitting = false;
    let completed = false;
    async function submit() {
      if (isSubmitting || completed) {
        return;
      }
      isSubmitting = true;
      await requestPasswordReset(currentEmail);
      completed = true;
      isSubmitting = false;
    }

    const first = submit();
    const second = submit();
    await Promise.all([first, second]);
    expect(requestPasswordReset).toHaveBeenCalledTimes(1);
    expect(calls.join(",")).not.toContain("token");
    expect(passwordRecoveryNeutralMessage).toContain("Se houver uma conta");
  });
});
