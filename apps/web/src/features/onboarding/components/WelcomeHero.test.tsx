import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const context = vi.hoisted(() => ({
  value: {} as Record<string, unknown>,
}));

const navigate = vi.hoisted(() => vi.fn());

const startJourney = vi.hoisted(() => ({
  onClick: undefined as undefined | (() => void),
}));

vi.mock("@/features/landing/context/StudyProgressContext", () => ({
  useStudyProgress: () => context.value,
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
      const props = args[1] as { children?: unknown; onClick?: () => void } | null;
      if (props?.children === "Começar Minha Jornada") {
        startJourney.onClick = props.onClick;
      }
      return actual.jsxDEV(...args);
    },
  };
});

vi.mock("react/jsx-runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react/jsx-runtime")>();

  function captureStartButton(props: { children?: unknown; onClick?: () => void } | null) {
    if (props?.children === "Começar Minha Jornada") {
      startJourney.onClick = props.onClick;
    }
  }

  return {
    ...actual,
    jsx: (...args: Parameters<typeof actual.jsx>) => {
      captureStartButton(
        args[1] as { children?: unknown; onClick?: () => void } | null,
      );
      return actual.jsx(...args);
    },
    jsxs: (...args: Parameters<typeof actual.jsxs>) => {
      captureStartButton(
        args[1] as { children?: unknown; onClick?: () => void } | null,
      );
      return actual.jsxs(...args);
    },
  };
});

import { WelcomeHero } from "./WelcomeHero";

const baseContext = {
  studyGoal: null,
  setStudyGoal: vi.fn(),
  isStudyGoalLoading: false,
  isStudyGoalSaving: false,
  studyGoalError: null,
  studyTrack: null,
  setStudyTrack: vi.fn(),
  isStudyTrackLoading: false,
  isStudyTrackSaving: false,
  studyTrackError: null,
};

function renderHero(overrides: Record<string, unknown> = {}) {
  context.value = { ...baseContext, ...overrides };
  startJourney.onClick = undefined;
  return renderToStaticMarkup(
    <MemoryRouter>
      <WelcomeHero />
    </MemoryRouter>,
  );
}

function startJourneyButton(html: string) {
  const match = html.match(/<button[^>]*>Começar Minha Jornada<\/button>/);
  return match?.[0] ?? "";
}

function isStartJourneyDisabled(html: string) {
  return /<button[^>]*\sdisabled[\s>=]/.test(startJourneyButton(html));
}

describe("WelcomeHero onboarding start flow", () => {
  beforeEach(() => {
    navigate.mockReset();
  });

  it("desabilita o CTA e orienta quando não há objetivo", () => {
    const html = renderHero();

    expect(html.indexOf("Quem você deseja se tornar?")).toBeGreaterThan(-1);
    expect(html.indexOf("Quem você deseja se tornar?")).toBeLessThan(
      html.indexOf("Começar Minha Jornada"),
    );
    expect(isStartJourneyDisabled(html)).toBe(true);
    expect(startJourneyButton(html)).toContain(
      'aria-describedby="onboarding-start-hint"',
    );
    expect(html).toContain("Escolha um objetivo acima para começar.");
    expect(html).not.toContain("Sua trilha de concurso");
  });

  it("habilita o CTA quando o objetivo persistido não exige trilha", () => {
    const html = renderHero({
      studyGoal: { id: "idiomas", title: "Idiomas" },
    });

    expect(isStartJourneyDisabled(html)).toBe(false);
    expect(startJourneyButton(html)).not.toContain("aria-describedby");
    expect(html).not.toContain("Escolha um objetivo acima para começar.");
    expect(html).not.toContain(
      "Para Concursos, escolha também sua trilha/concurso acima.",
    );
    expect(html).not.toContain("Sua trilha de concurso");
  });

  it("desabilita o CTA e pede a trilha quando Concursos não tem studyTrack", () => {
    const html = renderHero({
      studyGoal: { id: "concursos", title: "Concursos" },
    });

    expect(html.indexOf("Quem você deseja se tornar?")).toBeLessThan(
      html.indexOf("Sua trilha de concurso"),
    );
    expect(html.indexOf("Sua trilha de concurso")).toBeLessThan(
      html.indexOf("Começar Minha Jornada"),
    );
    expect(isStartJourneyDisabled(html)).toBe(true);
    expect(startJourneyButton(html)).toContain(
      'aria-describedby="onboarding-start-hint"',
    );
    expect(html).toContain(
      "Para Concursos, escolha também sua trilha/concurso acima.",
    );
  });

  it("habilita o CTA quando Concursos tem studyTrack", () => {
    const html = renderHero({
      studyGoal: { id: "concursos", title: "Concursos" },
      studyTrack: { examId: "gcm-vunesp-pilot" },
    });

    expect(isStartJourneyDisabled(html)).toBe(false);
    expect(html).not.toContain(
      "Para Concursos, escolha também sua trilha/concurso acima.",
    );
  });

  it("navega para /dashboard quando o CTA é acionado e a jornada está pronta", () => {
    renderHero({
      studyGoal: { id: "idiomas", title: "Idiomas" },
    });

    expect(startJourney.onClick).toEqual(expect.any(Function));
    startJourney.onClick?.();
    expect(navigate).toHaveBeenCalledWith("/dashboard");
  });

  it("não navega quando o CTA é acionado sem estar pronto", () => {
    renderHero();

    startJourney.onClick?.();
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each([
    ["isStudyGoalLoading", { isStudyGoalLoading: true }],
    ["isStudyGoalSaving", { isStudyGoalSaving: true }],
  ] as const)(
    "não mostra hint de objetivo durante %s",
    (_flag, overrides) => {
      const html = renderHero(overrides);

      expect(isStartJourneyDisabled(html)).toBe(true);
      expect(html).not.toContain("Escolha um objetivo acima para começar.");
      expect(html).not.toContain(
        "Para Concursos, escolha também sua trilha/concurso acima.",
      );
    },
  );

  it.each([
    ["isStudyTrackLoading", { isStudyTrackLoading: true }],
    ["isStudyTrackSaving", { isStudyTrackSaving: true }],
  ] as const)(
    "não mostra hint de trilha durante %s",
    (_flag, overrides) => {
      const html = renderHero({
        studyGoal: { id: "concursos", title: "Concursos" },
        ...overrides,
      });

      expect(isStartJourneyDisabled(html)).toBe(true);
      expect(html).not.toContain(
        "Para Concursos, escolha também sua trilha/concurso acima.",
      );
      expect(html).not.toContain("Escolha um objetivo acima para começar.");
    },
  );
});
