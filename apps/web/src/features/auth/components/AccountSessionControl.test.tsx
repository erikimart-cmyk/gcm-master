import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  isLoading: false,
  user: { id: "user-a" } as { id: string } | null,
  signOut: vi.fn(),
}));

vi.mock("../context/useAuth", () => ({
  useAuth: () => auth,
}));

import { accountSignOutFailedMessage } from "../lib/accountSessionActions";
import { AccountSessionControl, AccountSessionControlView } from "./AccountSessionControl";

function renderControl() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <AccountSessionControl />
    </MemoryRouter>,
  );
}

describe("AccountSessionControl", () => {
  beforeEach(() => {
    auth.isLoading = false;
    auth.user = { id: "user-a" };
    auth.signOut.mockReset();
  });

  it("shows the account control when authenticated", () => {
    const html = renderControl();
    expect(html).toContain("Minha conta");
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).not.toContain("Sair da conta");
  });

  it("does not show an active session control when signed out", () => {
    auth.user = null;
    const html = renderControl();
    expect(html).not.toContain("Minha conta");
    expect(html).not.toContain("Sair da conta");
  });

  it("does not show an active session control while auth is loading", () => {
    auth.isLoading = true;
    const html = renderControl();
    expect(html).not.toContain("Minha conta");
  });

  it("exposes Sair da conta when the menu is open", () => {
    const html = renderToStaticMarkup(
      <AccountSessionControlView
        error={null}
        menuId="account-menu"
        onClose={() => undefined}
        onSignOut={() => undefined}
        onToggle={() => undefined}
        open
        signingOut={false}
      />,
    );
    expect(html).toContain("Sair da conta");
    expect(html).toContain('role="menu"');
    expect(html).toContain('role="menuitem"');
    expect(html).toContain('aria-expanded="true"');
  });

  it("blocks duplicate sign-out while the operation is in progress", () => {
    const html = renderToStaticMarkup(
      <AccountSessionControlView
        error={null}
        menuId="account-menu"
        onClose={() => undefined}
        onSignOut={() => undefined}
        onToggle={() => undefined}
        open
        signingOut
      />,
    );
    expect(html).toContain("Saindo…");
    expect(html).toContain("disabled");
  });

  it("shows feedback when logout fails and does not claim success", () => {
    const html = renderToStaticMarkup(
      <AccountSessionControlView
        error={accountSignOutFailedMessage}
        menuId="account-menu"
        onClose={() => undefined}
        onSignOut={() => undefined}
        onToggle={() => undefined}
        open
        signingOut={false}
      />,
    );
    expect(html).toContain(accountSignOutFailedMessage);
    expect(html).toContain('role="alert"');
    expect(html).toContain("Sair da conta");
    expect(html).not.toContain("/auth");
  });
});
