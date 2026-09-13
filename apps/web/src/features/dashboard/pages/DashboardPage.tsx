import { DashboardHeader } from "../components/DashboardHeader";
import { DailyMissionCard } from "../components/DailyMissionCard";
import { GoalCard } from "../components/GoalCard";
import { NextStepCard } from "../components/NextStepCard";
import { PerformanceSummary } from "../components/PerformanceSummary";
import { PriorityCard } from "../components/PriorityCard";
import { ProgressNarrativeCard } from "../components/ProgressNarrativeCard";
import { SubjectPerformance } from "../components/SubjectPerformance";
import { StudyLevelCard } from "../components/StudyLevelCard";
import { getDashboardState } from "../services/getDashboardState";
import { getDashboardEngagementState } from "../services/getDashboardEngagementState";
import { getHighestStudyLevel } from "@/features/study/services/getStudyLevel";
import { useStudyProgress } from "@/features/landing/context/StudyProgressContext";
import { MainLayout } from "@/layouts/MainLayout";
import type { DailyMission } from "../types/DashboardEngagementState";

export function DashboardPage() {
  const {
    studyGoal,
    studyTrack,
    isStudyTrackLoading,
    studyTrackError,
    isProgressLoading,
    progressError,
    progress,
    subjectPerformance,
    prioritizedSubjects,
    reviewQuestions,
  } = useStudyProgress();

  const dashboardState = getDashboardState(
    progress,
    prioritizedSubjects.length > 0,
  );
  const topPriority = prioritizedSubjects[0];
  const engagementState = getDashboardEngagementState(
    progress,
    topPriority?.subject,
    reviewQuestions.length,
  );
  const studyLevel = getHighestStudyLevel(progress.questionResults);
  const requiresTrack = studyGoal?.id === "concursos";
  const isTrackUnavailable = requiresTrack && (!studyTrack || studyTrackError);
  const mustChooseTrack =
    isTrackUnavailable && engagementState.mission.state !== "review";
  const mission: DailyMission = mustChooseTrack
    ? {
        state: "first-step" as const,
        eyebrow: "Sua trilha de estudo",
        title: "Escolha sua trilha antes de iniciar novas questões",
        description:
          studyTrackError ??
          "Selecione o concurso no início da jornada para prepararmos uma sessão possível.",
        actionLabel: "Selecionar trilha",
        actionPath: "/onboarding",
      }
    : engagementState.mission;

  return (
    <MainLayout>
      <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <DashboardHeader />

        {isProgressLoading ? (
          <section
            aria-busy="true"
            className="mt-10 rounded-3xl border border-slate-800 bg-slate-900/70 p-8"
          >
            <p className="text-slate-300" role="status">
              Carregando seu histórico de estudos...
            </p>
          </section>
        ) : progressError ? (
          <section
            className="mt-10 rounded-3xl border border-red-500/30 bg-slate-900/70 p-8"
            role="alert"
          >
            <h2 className="text-xl font-bold text-white">
              Não foi possível carregar seu progresso
            </h2>
            <p className="mt-3 text-red-200">{progressError}</p>
            <p className="mt-3 text-sm text-slate-400">
              Recarregue a página antes de seguir uma recomendação.
            </p>
          </section>
        ) : (
          <div className="mt-10 space-y-8">
            <DailyMissionCard
              isLoading={requiresTrack && isStudyTrackLoading}
              mission={mission}
            />
            <div className="grid gap-6 lg:grid-cols-3">
              <ProgressNarrativeCard
                isLoading={isProgressLoading}
                narrative={engagementState.narrative}
              />
              <GoalCard goal={studyGoal} />
              <StudyLevelCard
                isLoading={isProgressLoading}
                level={studyLevel}
              />
            </div>
            <PerformanceSummary
              progress={progress}
              accuracy={dashboardState.accuracy}
            />

            <div className="grid gap-8 lg:grid-cols-2">
              <SubjectPerformance
                subjects={subjectPerformance}
                prioritySubject={topPriority?.subject}
              />
              <PriorityCard
                priority={topPriority}
                state={dashboardState.attentionState}
              />
            </div>

            <NextStepCard
              nextStep={dashboardState.nextStep}
              prioritySubject={topPriority?.subject}
            />
          </div>
        )}
      </div>
    </MainLayout>
  );
}
