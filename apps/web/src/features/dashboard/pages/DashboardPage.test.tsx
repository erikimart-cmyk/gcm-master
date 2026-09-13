import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const context = vi.hoisted(() => ({
  value: {} as Record<string, unknown>,
}));

vi.mock("@/features/landing/context/StudyProgressContext", () => ({
  useStudyProgress: () => context.value,
}));

vi.mock("@/layouts/MainLayout", () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../components/DashboardHeader", () => ({
  DashboardHeader: () => <div>dashboard-header</div>,
}));
vi.mock("../components/DailyMissionCard", () => ({
  DailyMissionCard: ({
    mission,
    isLoading,
  }: {
    mission: { state: string; title: string; actionLabel: string; actionPath: string };
    isLoading: boolean;
  }) => (
    <div data-loading={isLoading}>
      mission:{mission.state}|{mission.title}|{mission.actionLabel}|{mission.actionPath}
    </div>
  ),
}));

vi.mock("../components/GoalCard", () => ({
  GoalCard: () => <div>GoalCard</div>,
}));
vi.mock("../components/NextStepCard", () => ({
  NextStepCard: () => <div>NextStepCard</div>,
}));
vi.mock("../components/PriorityCard", () => ({
  PriorityCard: () => <div>PriorityCard</div>,
}));
vi.mock("../components/ProgressNarrativeCard", () => ({
  ProgressNarrativeCard: () => <div>ProgressNarrativeCard</div>,
}));
vi.mock("../components/StudyLevelCard", () => ({
  StudyLevelCard: () => <div>StudyLevelCard</div>,
}));

vi.mock("../components/SubjectPerformance", () => ({
  SubjectPerformance: ({ prioritySubject }: { prioritySubject?: string }) => (
    <div>subjects-priority:{prioritySubject ?? "none"}</div>
  ),
}));

import { DashboardPage } from "./DashboardPage";

const baseContext = {
  studyGoal: { id: "oab", title: "OAB" },
  studyTrack: null,
  isStudyTrackLoading: false,
  studyTrackError: null,
  isProgressLoading: false,
  progressError: null,
  progress: {
    questionsAnswered: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    studySessions: 0,
    questionResults: [],
  },
  subjectPerformance: [],
  prioritizedSubjects: [],
  reviewQuestions: [],
};

function renderDashboard(overrides: Record<string, unknown> = {}) {
  context.value = { ...baseContext, ...overrides };
  return renderToStaticMarkup(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    context.value = { ...baseContext };
  });

  it("orienta o primeiro acesso sem exibir percentual ou métricas zeradas", () => {
    const html = renderDashboard();

    expect(html).toContain(
      "mission:first-step|Responda 5 questões para iniciar sua jornada|Começar estudando|/revisao/questoes",
    );
    expect(html).toContain("Aguardando histórico");
    expect(html).not.toContain("0%");
  });

  it("usa a prioridade atual na missão e mantém um único CTA principal", () => {
    const html = renderDashboard({
      progress: {
        ...baseContext.progress,
        questionsAnswered: 8,
        correctAnswers: 5,
        wrongAnswers: 3,
      },
      subjectPerformance: [
        { subject: "Administrativo", questionsAnswered: 8, accuracy: 62 },
      ],
      prioritizedSubjects: [
        { subject: "Administrativo", questionsAnswered: 8, accuracy: 62 },
      ],
      reviewQuestions: [{ id: 1 }, { id: 2 }],
    });

    expect(html).toContain(
      "mission:review|Reforce Administrativo|Revisar agora|/revisao",
    );
    expect(html).toContain("subjects-priority:Administrativo");
    expect(html.match(/Revisar agora/g)).toHaveLength(1);
  });

  it("bloqueia métricas e recomendações enquanto hidrata", () => {
    const html = renderDashboard({ isProgressLoading: true });

    expect(html).toContain('role="status"');
    expect(html).toContain("Carregando seu histórico de estudos");
    expect(html).not.toContain("mission:");
    expect(html).not.toContain("PerformanceSummary");
  });

  it("bloqueia métricas e recomendações quando a hidratação falha", () => {
    const html = renderDashboard({
      progressError: "Falha de hidratação simulada.",
    });

    expect(html).toContain('role="alert"');
    expect(html).toContain("Falha de hidratação simulada.");
    expect(html).not.toContain("mission:");
    expect(html).not.toContain("PerformanceSummary");
  });

  it("orienta concursos sem trilha ao onboarding e não inicia questões", () => {
    const html = renderDashboard({
      studyGoal: { id: "concursos", title: "Concursos" },
    });

    expect(html).toContain(
      "mission:first-step|Escolha sua trilha antes de iniciar novas questões|Selecionar trilha|/onboarding",
    );
    expect(html).not.toContain("|/revisao/questoes");
  });
});
