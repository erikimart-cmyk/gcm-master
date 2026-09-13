import type { ProgressNarrative } from "../types/DashboardEngagementState";

type ProgressNarrativeCardProps = {
  narrative: ProgressNarrative;
  isLoading: boolean;
};

const toneClasses: Record<ProgressNarrative["tone"], string> = {
  initial: "border-blue-500/20 bg-blue-500/10",
  positive: "border-emerald-500/20 bg-emerald-500/10",
  attention: "border-amber-500/20 bg-amber-500/10",
};

const toneLabel: Record<ProgressNarrative["tone"], string> = {
  initial: "Começo da jornada",
  positive: "Evolução em movimento",
  attention: "Evolução com foco",
};

export function ProgressNarrativeCard({
  narrative,
  isLoading,
}: ProgressNarrativeCardProps) {
  if (isLoading) {
    return (
      <section
        aria-busy="true"
        aria-label="Carregando evolução"
        className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
      >
        <p className="text-sm text-slate-400">Carregando sua evolução...</p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="progress-narrative-title"
      className={`rounded-2xl border p-5 ${toneClasses[narrative.tone]}`}
    >
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-300">
        {toneLabel[narrative.tone]}
      </p>
      <h2
        id="progress-narrative-title"
        className="mt-2 text-xl font-bold text-white"
      >
        {narrative.title}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200">
        {narrative.description}
      </p>
    </section>
  );
}
