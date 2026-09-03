import type { SubjectPerformance } from "@/features/study/types/SubjectPerformance";
import type { DashboardState } from "../types/DashboardState";

type PriorityCardProps = {
  priority: SubjectPerformance | undefined;
  state: DashboardState["attentionState"];
};

export function PriorityCard({ priority, state }: PriorityCardProps) {
  return (
    <section aria-labelledby="priority-title" className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 md:p-8">
      <h2 id="priority-title" className="text-2xl font-bold text-white">
        Pontos de atenção
      </h2>
      {state === "priority" && priority ? (
        <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-400">
            Sua principal prioridade
          </p>
          <h3 className="mt-2 text-xl font-bold text-white">{priority.subject}</h3>
          <p className="mt-2 text-slate-300">
            {priority.wrongAnswers} {priority.wrongAnswers === 1 ? "erro" : "erros"} em {priority.questionsAnswered} {priority.questionsAnswered === 1 ? "questão" : "questões"}.
          </p>
        </div>
      ) : state === "up-to-date" ? (
        <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
          <p className="font-semibold text-emerald-400">Você está em dia!</p>
          <p className="mt-2 text-slate-300">Nenhum ponto de atenção identificado.</p>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-800/60 p-5">
          <p className="font-semibold text-slate-200">Aguardando suas primeiras respostas</p>
          <p className="mt-2 text-slate-400">
            Seus pontos de atenção aparecerão quando houver histórico de estudo.
          </p>
        </div>
      )}
    </section>
  );
}
