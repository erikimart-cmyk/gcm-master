import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const context = vi.hoisted(() => ({
  value: {} as Record<string, unknown>,
}));

vi.mock("@/features/landing/context/StudyProgressContext", () => ({
  useStudyProgress: () => context.value,
}));

vi.mock("./CanonicalStudySession", () => ({
  CanonicalStudySession: () => <div>canonical-study-runtime</div>,
}));

vi.mock("./ReviewQuestionSession", () => ({
  ReviewQuestionSession: () => <div>legacy-review-runtime</div>,
}));

import { QuestionsPage } from "./QuestionsPage";

function renderQuestions(
  path: string,
  overrides: Record<string, unknown> = {},
) {
  context.value = {
    isProgressLoading: false,
    studyGoal: { id: "concursos", title: "Concursos" },
    studyTrack: { examId: "gcm-vunesp-pilot" },
    isStudyTrackLoading: false,
    studyTrackError: null,
    ...overrides,
  };

  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <QuestionsPage />
    </MemoryRouter>,
  );
}

describe("QuestionsPage cutover boundary", () => {
  it("orienta ao onboarding sem montar uma sessão impossível", () => {
    const html = renderQuestions("/revisao/questoes", { studyTrack: null });

    expect(html).toContain("Selecione sua trilha de concurso");
    expect(html).toContain('href="/onboarding"');
    expect(html).not.toContain("canonical-study-runtime");
    expect(html).not.toContain("Questão 1 de");
  });

  it("expõe falha de trilha como alerta e mantém a saída segura", () => {
    const html = renderQuestions("/revisao/questoes", {
      studyTrack: null,
      studyTrackError: "Falha de trilha simulada.",
    });

    expect(html).toContain('role="alert"');
    expect(html).toContain("Falha de trilha simulada.");
    expect(html).toContain('href="/onboarding"');
  });

  it("routes normal study to the canonical runtime", () => {
    const html = renderQuestions("/revisao/questoes");
    expect(html).toContain("canonical-study-runtime");
    expect(html).not.toContain("legacy-review-runtime");
  });

  it("keeps review mode on the legacy branch", () => {
    const html = renderQuestions("/revisao/questoes?mode=errors");
    expect(html).toContain("legacy-review-runtime");
    expect(html).not.toContain("canonical-study-runtime");
  });
});
