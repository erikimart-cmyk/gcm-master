import type { StudyLevel } from "@/features/study/types/StudyLevel";

type StudyLevelCardProps = {
  level: StudyLevel;
  isLoading: boolean;
};

export function StudyLevelCard({ level, isLoading }: StudyLevelCardProps) {
  if (isLoading) {
    return (
      <section
        aria-busy="true"
        aria-label="Carregando nível de prática"
        className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
      >
        <p className="text-sm text-slate-400">Calculando seu nível de prática...</p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="study-level-title"
      className="rounded-2xl border border-violet-500/25 bg-violet-500/10 p-5"
    >
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-200">
        Seu nível de prática
      </p>
      <h2 id="study-level-title" className="mt-2 text-xl font-bold text-white">
        {level.title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-200">{level.description}</p>
      {level.nextMilestone && (
        <p className="mt-4 border-t border-violet-300/15 pt-4 text-xs leading-5 text-violet-100">
          Próximo marco: {level.nextMilestone}
        </p>
      )}
      <p className="mt-3 text-xs text-slate-400">
        Indicador de prática na ZYNVO; não é certificação profissional.
      </p>
    </section>
  );
}
