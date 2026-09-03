import { Link } from "react-router-dom";

import type { NextStep } from "../types/DashboardState";

type NextStepCardProps = {
  nextStep: NextStep;
  prioritySubject?: string;
};

export function NextStepCard({ nextStep, prioritySubject }: NextStepCardProps) {
  return (
    <section aria-labelledby="next-step-title" className="rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-600/20 to-violet-600/10 p-6 md:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
        Próximo passo recomendado
      </p>
      <h2 id="next-step-title" className="mt-3 text-2xl font-bold text-white">
        {nextStep.title}
      </h2>
      <p className="mt-3 max-w-2xl text-slate-300">
        {nextStep.state === "review" && prioritySubject
          ? `${prioritySubject} é sua prioridade agora. ${nextStep.description}`
          : nextStep.description}
      </p>
      <Link to={nextStep.actionPath} className="mt-6 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400">
        {nextStep.actionLabel} →
      </Link>
    </section>
  );
}
