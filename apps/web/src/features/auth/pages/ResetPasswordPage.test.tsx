import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  configurationError: null as string | null,
  isLoading: false,
  passwordRecovery: false,
  passwordRecoveryStatus: "idle" as string,
  updatePasswordFromRecovery: vi.fn(),
  finishPasswordRecovery: vi.fn(),
}));

vi.mock("../context/useAuth", () => ({
  useAuth: () => auth,
}));

import {
  passwordRecoveryUnauthorizedGuidance,
  ResetPasswordPage,
  ResetPasswordView,
} from "./ResetPasswordPage";
import {
  passwordRecoverySuccessMessage,
  passwordRecoveryUnauthorizedMessage,
  passwordRecoveryUpdateFailedMessage,
} from "../lib/passwordRecoveryActions";
import type { PasswordRecoveryStatus } from "../lib/passwordRecoveryGate";

function renderReset() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <ResetPasswordPage />
    </MemoryRouter>,
  );
}

function renderView(
  overrides: Partial<Parameters<typeof ResetPasswordView>[0]> = {},
) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <ResetPasswordView
        configurationError={null}
        confirmation=""
        error={null}
        isLoading={false}
        isSubmitting={false}
        onConfirmationChange={() => undefined}
        onPasswordChange={() => undefined}
        onSubmit={(event) => event.preventDefault()}
        outcome="idle"
        password=""
        passwordRecovery={false}
        passwordRecoveryStatus="idle"
        {...overrides}
      />
    </MemoryRouter>,
  );
}

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    auth.configurationError = null;
    auth.isLoading = false;
    auth.passwordRecovery = false;
    auth.passwordRecoveryStatus = "idle";
    auth.updatePasswordFromRecovery.mockReset();
    auth.finishPasswordRecovery.mockReset();
  });

  it("blocks a common session from updating the password", () => {
    auth.passwordRecovery = false;
    auth.passwordRecoveryStatus = "idle";
    const html = renderReset();
    expect(html).toContain(passwordRecoveryUnauthorizedGuidance);
    expect(html).toContain("Solicitar um novo link");
    expect(html).toContain('href="/auth/forgot-password"');
    expect(html).not.toContain("Atualizar senha");
    expect(html).not.toContain(passwordRecoverySuccessMessage);
    expect(auth.updatePasswordFromRecovery).not.toHaveBeenCalled();
  });

  it("blocks a recovered reload without PASSWORD_RECOVERY", () => {
    auth.passwordRecoveryStatus = "blocked";
    const html = renderReset();
    expect(html).toContain(passwordRecoveryUnauthorizedGuidance);
    expect(html).toContain('href="/auth/forgot-password"');
    expect(html).not.toContain("Atualizar senha");
    expect(html).not.toContain(passwordRecoverySuccessMessage);
    expect(auth.updatePasswordFromRecovery).not.toHaveBeenCalled();
  });

  it("shows the form only when recovery is authorized", () => {
    auth.passwordRecovery = true;
    auth.passwordRecoveryStatus = "authorized";
    const html = renderReset();
    expect(html).toContain("Atualizar senha");
    expect(html).toContain("new-password");
    expect(html).toContain("confirm-password");
    expect(html).not.toContain("eyJ");
    expect(html).not.toContain(passwordRecoveryUnauthorizedGuidance);
  });
});

describe("ResetPasswordView recovery outcomes", () => {
  it("shows success after authorized updateUser without the invalid-session alert", () => {
    const html = renderView({
      passwordRecovery: true,
      passwordRecoveryStatus: "authorized",
      outcome: "updated",
    });
    expect(html).toContain(passwordRecoverySuccessMessage);
    expect(html).toContain("Voltar ao login");
    expect(html).toContain('href="/auth"');
    expect(html).not.toContain(passwordRecoveryUnauthorizedGuidance);
    expect(html).not.toContain(passwordRecoveryUnauthorizedMessage);
    expect(html).not.toContain("Solicitar um novo link");
    expect(html).not.toContain("Atualizar senha");
  });

  it("keeps success visible after consume and hides the invalid-session alert", () => {
    const html = renderView({
      passwordRecovery: false,
      passwordRecoveryStatus: "consumed",
      outcome: "updated",
    });
    expect(html).toContain(passwordRecoverySuccessMessage);
    expect(html).not.toContain(passwordRecoveryUnauthorizedGuidance);
    expect(html).not.toContain("Solicitar um novo link");
    expect(html).not.toContain("Atualizar senha");
  });

  it("keeps success visible after invalidate to idle without offering a second update", () => {
    const html = renderView({
      passwordRecovery: false,
      passwordRecoveryStatus: "idle",
      outcome: "updated",
    });
    expect(html).toContain(passwordRecoverySuccessMessage);
    expect(html).not.toContain(passwordRecoveryUnauthorizedGuidance);
    expect(html).not.toContain("Atualizar senha");
    expect(html).not.toContain('id="new-password"');
  });

  it("does not confirm success when updateUser fails", () => {
    const html = renderView({
      passwordRecovery: false,
      passwordRecoveryStatus: "blocked",
      outcome: "idle",
      error: passwordRecoveryUpdateFailedMessage,
    });
    expect(html).toContain(passwordRecoveryUpdateFailedMessage);
    expect(html).not.toContain(passwordRecoveryUnauthorizedGuidance);
    expect(html).not.toContain(passwordRecoveryUnauthorizedMessage);
    expect(html).not.toContain(passwordRecoverySuccessMessage);
    expect(html.split('role="alert"')).toHaveLength(2);
  });

  it("does not confirm success for an unauthorized recovery session", () => {
    const html = renderView({
      passwordRecovery: false,
      passwordRecoveryStatus: "path-isolated" as PasswordRecoveryStatus,
      outcome: "idle",
    });
    expect(html).toContain(passwordRecoveryUnauthorizedGuidance);
    expect(html).toContain("Solicitar um novo link");
    expect(html).not.toContain(passwordRecoverySuccessMessage);
    expect(html).not.toContain("Atualizar senha");
  });

  it("does not offer a second update after the authorization is consumed", () => {
    const html = renderView({
      passwordRecovery: false,
      passwordRecoveryStatus: "consumed",
      outcome: "updated",
    });
    expect(html).toContain(passwordRecoverySuccessMessage);
    expect(html).not.toContain("Atualizar senha");
    expect(html).not.toContain('id="new-password"');
    expect(html).not.toContain("Solicitar um novo link");
  });

  it("guides a consumed authorization without a recorded success", () => {
    const html = renderView({
      passwordRecovery: false,
      passwordRecoveryStatus: "consumed",
      outcome: "idle",
    });
    expect(html).toContain(passwordRecoveryUnauthorizedGuidance);
    expect(html).toContain('href="/auth/forgot-password"');
    expect(html).not.toContain(passwordRecoverySuccessMessage);
    expect(html).not.toContain("Atualizar senha");
  });

  it("does not show success or form while the recovery link is still being checked", () => {
    const html = renderView({
      isLoading: true,
      passwordRecovery: false,
      passwordRecoveryStatus: "path-isolated",
      outcome: "idle",
    });
    expect(html).toContain("Verificando o link de redefinição");
    expect(html).not.toContain(passwordRecoveryUnauthorizedGuidance);
    expect(html).not.toContain(passwordRecoverySuccessMessage);
    expect(html).not.toContain("Atualizar senha");
  });
});
