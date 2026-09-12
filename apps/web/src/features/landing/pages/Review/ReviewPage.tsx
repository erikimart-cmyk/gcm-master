import { Link, useNavigate } from "react-router-dom";

import { MainLayout } from "@/layouts/MainLayout";
import { useStudyProgress } from "@/features/landing/context/StudyProgressContext";

export function ReviewPage() {
  const navigate = useNavigate();

  const {
    progress,
    prioritizedSubjects,
    reviewQuestions,
  } = useStudyProgress();

  const hasStudyHistory = progress.questionResults.length > 0;

  const topPriority = prioritizedSubjects[0];

  return (
    <MainLayout>
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-10">
          <span className="inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-400">
            Revisão personalizada
          </span>

          <h1 className="mt-6 text-4xl font-bold text-white md:text-5xl">
            Sua revisão
          </h1>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-400">
            A ZYNVO identifica os conteúdos que merecem mais atenção para
            melhorar seu desempenho.
          </p>

          <Link
            className="mt-6 inline-flex rounded-xl border border-violet-500/30 bg-violet-500/10 px-5 py-3 font-semibold text-violet-200 transition hover:bg-violet-500/20"
            to="/revisao/conteudo"
          >
            Conteúdo de revisão →
          </Link>
        </div>

        {!topPriority && !hasStudyHistory && (
          <div className="rounded-3xl border border-blue-500/20 bg-slate-900/70 p-8 shadow-xl">
            <div className="flex flex-col gap-8 md:flex-row md:items-start">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-blue-600 text-2xl font-medium text-white">
                IA
              </div>

              <div>
                <p className="text-lg font-semibold uppercase tracking-wide text-blue-400">
                  Inteligência ZYNVO
                </p>

                <h2 className="mt-4 text-3xl font-bold text-white">
                  Sua revisão inteligente está pronta
                </h2>

                <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
                  Responda algumas questões para que a ZYNVO analise seu
                  desempenho e identifique automaticamente quais conteúdos
                  precisam de mais atenção.
                </p>

                <button
                  type="button"
                  onClick={() => navigate("/revisao/questoes")}
                  className="mt-8 rounded-2xl bg-blue-600 px-8 py-4 text-lg font-bold text-white transition hover:bg-blue-500"
                >
                  Começar questões →
                </button>
              </div>
            </div>
          </div>
        )}
{!topPriority && hasStudyHistory && (
  <div className="rounded-3xl border border-emerald-500/20 bg-slate-900/70 p-8 shadow-xl">
    <div className="flex flex-col gap-8 md:flex-row md:items-start">
      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-emerald-600 text-2xl font-medium text-white">
        ✓
      </div>

      <div>
        <p className="text-lg font-semibold uppercase tracking-wide text-emerald-400">
          Inteligência ZYNVO
        </p>

        <h2 className="mt-4 text-3xl font-bold text-white">
          Você está em dia!
        </h2>

        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
          A ZYNVO analisou seu desempenho e, neste momento, não
          encontrou questões pendentes que precisem de revisão.
          Continue praticando para manter seu desempenho.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400">
            ✓ Nenhum erro pendente
          </span>

          <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400">
            Desempenho atualizado
          </span>
        </div>

        <button
          type="button"
          onClick={() => navigate("/revisao/questoes")}
          className="mt-8 rounded-2xl bg-blue-600 px-8 py-4 text-lg font-bold text-white transition hover:bg-blue-500"
        >
          Continuar estudando →
        </button>
      </div>
    </div>
  </div>
)}

        {topPriority && (
          <>
            <div className="mb-8 rounded-3xl border border-blue-500/20 bg-blue-500/10 p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xl">
                  IA
                </div>

                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
                    Recomendação ZYNVO
                  </p>

                  <h2 className="mt-2 text-2xl font-bold text-white">
                    Sua próxima prioridade é{" "}
                    {topPriority.subject}
                  </h2>

                  <p className="mt-3 text-slate-300 leading-7">
                    Seu aproveitamento atual nessa disciplina é de{" "}
                    <strong>{topPriority.accuracy}%</strong>.
                    A ZYNVO recomenda reforçar esse conteúdo antes de
                    avançar para as próximas matérias.
                  </p>

                  <p className="mt-3 text-sm text-slate-400">
                    {topPriority.questionsAnswered}{" "}
                    {topPriority.questionsAnswered === 1
                      ? "questão"
                      : "questões"}{" "}
                    respondidas · {topPriority.correctAnswers}{" "}
                    {topPriority.correctAnswers === 1
                      ? "acerto"
                      : "acertos"}{" "}
                    · {topPriority.wrongAnswers}{" "}
                    {topPriority.wrongAnswers === 1
                      ? "erro"
                      : "erros"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl">
              <h2 className="text-2xl font-semibold text-white">
                {topPriority.subject}
              </h2>

              <p className="mt-3 text-slate-400 leading-7">
                Seu desempenho atual está em{" "}
                <strong className="text-white">
                  {topPriority.accuracy}%
                </strong>
                . Vamos reforçar esse conteúdo com uma revisão direcionada.
              </p>

              <div className="mt-5 flex flex-wrap gap-3 text-sm">
                <span className="rounded-full bg-slate-800 px-4 py-2 text-slate-300">
                  {topPriority.questionsAnswered}{" "}
                  {topPriority.questionsAnswered === 1
                    ? "questão"
                    : "questões"}{" "}
                  respondidas
                </span>

                <span className="rounded-full bg-green-500/10 px-4 py-2 text-green-400">
                  {topPriority.correctAnswers}{" "}
                  {topPriority.correctAnswers === 1
                    ? "acerto"
                    : "acertos"}
                </span>

                <span className="rounded-full bg-red-500/10 px-4 py-2 text-red-400">
                  {topPriority.wrongAnswers}{" "}
                  {topPriority.wrongAnswers === 1
                    ? "erro"
                    : "erros"}
                </span>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/revisao/questoes")}
                  className="inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-500"
                >
                  Iniciar revisão
                </button>

                {reviewQuestions.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate("/revisao/questoes?mode=errors")
                    }
                    className="inline-flex rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-3 font-semibold text-red-400 transition hover:bg-red-500/20"
                  >
                    Revisar meus erros →
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </section>
    </MainLayout>
  );
}