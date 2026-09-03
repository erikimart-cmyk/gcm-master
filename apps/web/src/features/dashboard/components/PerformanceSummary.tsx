import type { DashboardProgress } from "../types/DashboardState";

type PerformanceSummaryProps = {
  progress: DashboardProgress;
  accuracy: number | null;
};

export function PerformanceSummary({
  progress,
  accuracy,
}: PerformanceSummaryProps) {
  const metrics = [
    { label: "Respondidas", value: progress.questionsAnswered, color: "text-white" },
    { label: "Acertos", value: progress.correctAnswers, color: "text-emerald-400" },
    { label: "Erros", value: progress.wrongAnswers, color: "text-red-400" },
  ];

  return (
    <section aria-labelledby="performance-summary-title">
      <h2 id="performance-summary-title" className="text-2xl font-bold text-white">
        Resumo de desempenho
      </h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">{metric.label}</p>
            <p className={`mt-2 text-3xl font-bold ${metric.color}`}>{metric.value}</p>
          </div>
        ))}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-sm text-slate-400">Aproveitamento</p>
          {accuracy === null ? (
            <p className="mt-2 font-semibold text-blue-400">Aguardando histórico</p>
          ) : (
            <p className="mt-2 text-3xl font-bold text-blue-400">{accuracy}%</p>
          )}
        </div>
      </div>
    </section>
  );
}
