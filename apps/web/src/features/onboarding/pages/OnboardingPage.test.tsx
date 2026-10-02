import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  user: { id: "authenticated-user" } as { id: string } | null,
  signOut: vi.fn<() => Promise<void>>(),
}));

const study = vi.hoisted(() => ({
  setStudyGoal: vi.fn(),
  setStudyTrack: vi.fn(),
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

vi.mock("@/features/landing/context/StudyProgressContext", () => ({
  useStudyProgress: () => ({
    studyGoal: { id: "concursos", title: "Concursos" },
    setStudyGoal: study.setStudyGoal,
    isStudyGoalLoading: false,
    isStudyGoalSaving: false,
    studyGoalError: null,
    studyTrack: { examId: "gcm-vunesp-pilot" },
    setStudyTrack: study.setStudyTrack,
    isStudyTrackLoading: false,
    isStudyTrackSaving: false,
    studyTrackError: null,
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

import OnboardingPageSource from "./OnboardingPage.tsx?raw";
import { OnboardingPage } from "./OnboardingPage";

function captureSignOut(
  props: { children?: unknown; onClick?: () => void | Promise<void> } | null,
) {
  if (props?.children === "Sair") {
    signOutAction.onClick = props.onClick;
  }
}

function renderOnboarding() {
  signOutAction.onClick = undefined;
  return renderToStaticMarkup(
    <MemoryRouter>
      <OnboardingPage />
    </MemoryRouter>,
  );
}

describe("OnboardingPage logout", () => {
  beforeEach(() => {
    auth.user = { id: "authenticated-user" };
    auth.signOut.mockReset();
    auth.signOut.mockResolvedValue(undefined);
    study.setStudyGoal.mockReset();
    study.setStudyTrack.mockReset();
    navigate.mockReset();
  });

  it("mostra Sair para o usuário autenticado sem alterar o fluxo da jornada", () => {
    const html = renderOnboarding();

    expect(html).toContain(">Sair<");
    expect(html).toContain('type="button"');
    expect(html).toContain("Começar Minha Jornada");
    expect(html).toContain("Sua trilha de concurso");
    expect(study.setStudyGoal).not.toHaveBeenCalled();
    expect(study.setStudyTrack).not.toHaveBeenCalled();
  });

  it("não mostra Sair sem sessão autenticada", () => {
    auth.user = null;

    const html = renderOnboarding();

    expect(html).not.toContain(">Sair<");
  });

  it("aciona o signOut oficial e segue para /auth", async () => {
    renderOnboarding();

    await signOutAction.onClick?.();

    expect(auth.signOut).toHaveBeenCalledOnce();
    expect(auth.signOut).toHaveBeenCalledWith();
    expect(navigate).toHaveBeenCalledWith("/auth", { replace: true });
    expect(study.setStudyGoal).not.toHaveBeenCalled();
    expect(study.setStudyTrack).not.toHaveBeenCalled();
  });

  it("continua o onboarding sem criar profile", () => {
    const html = renderOnboarding();

    expect(html).toContain("Começar Minha Jornada");
    expect(html).toContain(">Sair<");
    expect(html).toContain("Sua trilha de concurso");
    expect(OnboardingPageSource).not.toContain("profiles");
    expect(OnboardingPageSource).not.toContain("ensureOwnProfile");
    expect(study.setStudyGoal).not.toHaveBeenCalled();
    expect(study.setStudyTrack).not.toHaveBeenCalled();
  });

  it("não navega nem grava objetivo ou trilha quando o signOut falha", async () => {
    auth.signOut.mockRejectedValueOnce(new Error("sign out failed"));
    renderOnboarding();

    await signOutAction.onClick?.();

    expect(auth.signOut).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
    expect(study.setStudyGoal).not.toHaveBeenCalled();
    expect(study.setStudyTrack).not.toHaveBeenCalled();
  });
});
