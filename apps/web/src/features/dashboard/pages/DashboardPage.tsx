import { DashboardHeader } from "../components/DashboardHeader";
import { GoalCard } from "../components/GoalCard";
import { NextStepCard } from "../components/NextStepCard";
import { PerformanceSummary } from "../components/PerformanceSummary";
import { PriorityCard } from "../components/PriorityCard";
import { SubjectPerformance } from "../components/SubjectPerformance";
import { getDashboardState } from "../services/getDashboardState";
import { useStudyProgress } from "@/features/landing/context/StudyProgressContext";
import { MainLayout } from "@/layouts/MainLayout";

export function DashboardPage() {
  const {
    studyGoal,
    progress,
    subjectPerformance,
    prioritizedSubjects,
  } = useStudyProgress();

  const dashboardState = getDashboardState(
    progress,
    prioritizedSubjects.length > 0,
  );
  const topPriority = prioritizedSubjects[0];

  return (
    <MainLayout>
      <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <DashboardHeader />

        <div className="mt-10 space-y-8">
          <GoalCard goal={studyGoal} />
          <PerformanceSummary progress={progress} accuracy={dashboardState.accuracy} />

          <div className="grid gap-8 lg:grid-cols-2">
            <SubjectPerformance subjects={subjectPerformance} />
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
      </div>
    </MainLayout>
  );
}
