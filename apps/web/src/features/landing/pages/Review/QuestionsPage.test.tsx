import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const context = vi.hoisted(() => ({
  value: {} as Record<string, unknown>,
}));

vi.mock("@/features/landing/context/StudyProgressContext", () => ({
  useStudyProgress: () => context.value,
}));

import { QuestionsPage } from "./QuestionsPage";

function renderQuestions(overrides: Record<string, unknown> = {}) {
  context.value = {
    isProgressLoading: false,
    studyGoal: { id: "concursos", title: "Concursos" },
    studyTrack: null,
    isStudyTrackLoading: false,
    studyTrackError: null,
    ...overrides,
  };

  return renderToStaticMarkup(
    <MemoryRouter initialEntries={["/revisao/questoes"]}>
      <QuestionsPage />
    </MemoryRouter>,
  );
}

describe("QuestionsPage sem trilha", () => {
  it("orienta ao onboarding sem montar uma sessão impossível", () => {
    const html = renderQuestions();

    expect(html).toContain("Selecione sua trilha de concurso");
    expect(html).toContain('href="/onboarding"');
    expect(html).not.toContain("Questão 1 de");
  });

  it("expõe falha de trilha como alerta e mantém a saída segura", () => {
    const html = renderQuestions({
      studyTrackError: "Falha de trilha simulada.",
    });

    expect(html).toContain('role="alert"');
    expect(html).toContain("Falha de trilha simulada.");
    expect(html).toContain('href="/onboarding"');
  });
});
