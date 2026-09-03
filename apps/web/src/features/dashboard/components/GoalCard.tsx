import type { StudyGoal } from "@/features/study/types/StudyGoal";

type GoalCardProps = {
  goal: StudyGoal | null;
};

export function GoalCard({ goal }: GoalCardProps) {
  return (
    <section className="rounded-3xl border border-blue-500/20 bg-blue-500/10 p-6 md:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
        🎯 Seu objetivo
      </p>
      {goal ? (
        <>
          <h2 className="mt-3 text-2xl font-bold text-white">{goal.title}</h2>
          {goal.description && (
            <p className="mt-2 text-slate-300">{goal.description}</p>
          )}
        </>
      ) : (
        <p className="mt-3 text-lg text-slate-300">
          Nenhum objetivo selecionado ainda.
        </p>
      )}
    </section>
  );
}
