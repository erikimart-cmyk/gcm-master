import type { RefObject } from "react";
import { Link } from "react-router-dom";

import type { CanonicalStudyViewState } from "@/features/study/types/CanonicalStudy";
import type { StudyLevel } from "@/features/study/types/StudyLevel";

type CanonicalStudyViewProps = {
  state: CanonicalStudyViewState;
  levelUp: StudyLevel | null;
  statementRef: RefObject<HTMLHeadingElement | null>;
  resultRef: RefObject<HTMLDivElement | null>;
  onSelectAlternative: (answerId: string) => void;
  onNext: () => void;
  onRetry: () => void;
  onGoReview: () => void;
  onGoDashboard: () => void;
};

function difficultyLabel(difficulty: string): string {
  if (difficulty === "easy") return "Fácil";
  if (difficulty === "medium") return "Média";
  if (difficulty === "hard") return "Difícil";
  return difficulty;
}

function sessionHeadline(recordedCount: number, sessionCap: number): string {
  const current = Math.min(recordedCount + 1, sessionCap);
  return `Questão ${current} de ${sessionCap}`;
}

export function CanonicalStudyView({
  state,
  levelUp,
  statementRef,
  resultRef,
  onSelectAlternative,
  onNext,
  onRetry,
  onGoReview,
  onGoDashboard,
}: CanonicalStudyViewProps) {
  const {
    phase,
    question,
    result,
    selectedAnswer,
    recordedCount,
    correctAnswers,
    wrongAnswers,
    statusMessage,
    errorMessage,
    alternativesEnabled,
    sessionCap,
  } = state;

  if (phase === "REQUESTING_DELIVERY" && !question) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
          <p className="text-slate-300" role="status">
            {statusMessage ?? "Preparando suas questões novas..."}
          </p>
        </div>
      </main>
    );
  }

  if (phase === "CONTEXT_NOT_READY") {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-amber-500/30 bg-slate-900 p-8 text-center">
          <h1 className="text-2xl font-bold">Selecione sua trilha de concurso</h1>
          <p className="mt-4 text-slate-300">
            Precisamos da sua trilha para preparar questões compatíveis com o
            concurso escolhido.
          </p>
          <Link
            className="mt-6 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white"
            to="/onboarding"
          >
            Selecionar trilha →
          </Link>
        </div>
      </main>
    );
  }

  if (phase === "DENIED" && !question) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-500/30 bg-slate-900 p-8 text-center">
          <p className="text-red-200" role="alert">
            {errorMessage ?? "Sua sessão expirou. Entre novamente para continuar."}
          </p>
          <Link
            className="mt-6 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white"
            to="/auth"
          >
            Entrar novamente
          </Link>
        </div>
      </main>
    );
  }

  if (phase === "ERROR_RETRYABLE" && !question) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-500/30 bg-slate-900 p-8 text-center">
          <p className="text-red-200" role="alert">
            {errorMessage ?? "Não foi possível preparar suas questões novas. Tente novamente."}
          </p>
          <button
            type="button"
            className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white"
            onClick={onRetry}
          >
            Tentar novamente
          </button>
        </div>
      </main>
    );
  }

  if (
    (phase === "UNAVAILABLE" || phase === "SESSION_DONE") &&
    !question &&
    recordedCount === 0
  ) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
              Revisão inteligente
            </p>
            <h1 className="mt-3 text-3xl font-bold">
              Você concluiu as questões novas disponíveis
            </h1>
            <p className="mt-4 text-slate-400">
              Não vamos repetir conteúdo como se fosse novo. Volte mais tarde
              quando houver novas questões no catálogo ou revise seus pontos de
              atenção.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
                to="/revisao"
              >
                Ir para revisão
              </Link>
              <Link
                className="rounded-xl border border-slate-600 px-5 py-3 font-semibold text-slate-200"
                to="/dashboard"
              >
                Voltar ao dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if ((phase === "SESSION_DONE" && !question) || !question) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-xl font-bold text-blue-400">🎉 Revisão concluída!</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-800 p-4">
                <p className="text-sm text-slate-400">Questões</p>
                <p className="mt-1 text-2xl font-bold">{recordedCount}</p>
              </div>
              <div className="rounded-xl bg-slate-800 p-4">
                <p className="text-sm text-slate-400">Acertos</p>
                <p className="mt-1 text-2xl font-bold text-green-400">
                  {correctAnswers}
                </p>
              </div>
              <div className="rounded-xl bg-slate-800 p-4">
                <p className="text-sm text-slate-400">Aproveitamento</p>
                <p className="mt-1 text-2xl font-bold text-blue-400">
                  {recordedCount === 0
                    ? 0
                    : Math.round((correctAnswers / recordedCount) * 100)}
                  %
                </p>
              </div>
            </div>
            <p className="mt-5 text-sm text-slate-400">Erros: {wrongAnswers}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={onGoReview}
                className="inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white"
              >
                ← Voltar para revisão
              </button>
              <button
                type="button"
                onClick={onGoDashboard}
                className="inline-flex rounded-xl border border-slate-600 bg-slate-800 px-6 py-3 font-semibold text-slate-200"
              >
                Voltar ao dashboard
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const isAnswered = phase === "ANSWERED" && result !== null;
  const showNext = isAnswered && recordedCount < sessionCap;
  const showSessionSummary = isAnswered && recordedCount >= sessionCap;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-blue-400">Revisão personalizada</p>
            <h1 className="mt-2 text-2xl font-bold">{question.subjectLabel}</h1>
            {question.topicLabel && (
              <p className="mt-1 text-sm text-slate-400">{question.topicLabel}</p>
            )}
          </div>
          <span className="rounded-full bg-slate-800 px-4 py-2 text-sm text-slate-300">
            {sessionHeadline(isAnswered ? recordedCount - 1 : recordedCount, sessionCap)}
          </span>
        </div>

        <div
          aria-label="Progresso da sessão de questões"
          aria-valuemax={sessionCap}
          aria-valuemin={0}
          aria-valuenow={Math.min(
            (isAnswered ? recordedCount : recordedCount + 1),
            sessionCap,
          )}
          className="mb-8 h-2 overflow-hidden rounded-full bg-slate-800"
          role="progressbar"
        >
          <div
            className="h-full rounded-full bg-blue-500 transition-all motion-reduce:transition-none"
            style={{
              width: `${
                (Math.min(
                  isAnswered ? recordedCount : recordedCount + 1,
                  sessionCap,
                ) /
                  sessionCap) *
                100
              }%`,
            }}
          />
        </div>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl">
          <div className="mb-6 flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
              Estudo
            </span>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-400">
              {difficultyLabel(question.difficulty)}
            </span>
          </div>

          <h2
            ref={statementRef}
            tabIndex={-1}
            className="text-xl font-semibold leading-8 outline-none"
          >
            {question.statement}
          </h2>

          <div className="mt-8 space-y-4">
            {question.alternatives.map((alternative) => {
              const isSelected = selectedAnswer === alternative.id;
              const canonicalCorrectId = result?.correctAnswer ?? null;
              const canHighlightCorrect =
                isAnswered && canonicalCorrectId !== null;
              const isCanonicalCorrect =
                canHighlightCorrect && canonicalCorrectId === alternative.id;

              let className =
                "border-slate-700 bg-slate-800 hover:border-blue-500 hover:bg-slate-700";

              if (isAnswered && isCanonicalCorrect) {
                className = "border-green-500 bg-green-500/10";
              }

              if (isAnswered && isSelected && !result.isCorrect) {
                className = "border-red-500 bg-red-500/10";
              }

              if (isAnswered && isSelected && result.isCorrect) {
                className = "border-green-500 bg-green-500/10";
              }

              return (
                <button
                  key={`${question.assignmentId}-${alternative.id}`}
                  type="button"
                  onClick={() => onSelectAlternative(alternative.id)}
                  disabled={!alternativesEnabled}
                  aria-pressed={isSelected}
                  className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${className} disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold">
                    {alternative.id}
                  </span>
                  <span className="text-slate-200">{alternative.text}</span>
                  {isAnswered && isCanonicalCorrect && (
                    <span className="ml-auto text-sm font-medium text-green-300">
                      Resposta canônica
                    </span>
                  )}
                  {isAnswered && isSelected && !result.isCorrect && (
                    <span className="ml-auto text-sm font-medium text-red-300">
                      Sua resposta
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {phase === "RENDERED_CONFIRMING" && (
            <p className="mt-4 text-sm text-slate-400" role="status">
              {statusMessage ?? CONFIRMING_FALLBACK}
            </p>
          )}

          {phase === "SUBMITTING" && (
            <p className="mt-4 text-sm text-slate-400" role="status">
              {statusMessage ?? "Registrando sua resposta..."}
            </p>
          )}

          {phase === "READY" && statusMessage && (
            <p className="mt-4 text-sm text-slate-400" role="status">
              {statusMessage}
            </p>
          )}

          {errorMessage && (
            <p className="mt-4 text-sm text-red-300" role="alert">
              {errorMessage}
            </p>
          )}

          {phase === "ERROR_RETRYABLE" && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
            >
              Tentar novamente
            </button>
          )}

          {levelUp && (
            <div
              className="mt-4 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4"
              role="status"
            >
              <p className="font-semibold text-violet-200">
                Você avançou para {levelUp.title}! ✦
              </p>
              <p className="mt-1 text-sm text-slate-200">{levelUp.description}</p>
            </div>
          )}

          {isAnswered && result && (
            <div
              ref={resultRef}
              tabIndex={-1}
              className="mt-8 rounded-2xl border border-slate-700 bg-slate-800/70 p-5 outline-none"
            >
              <p className="font-semibold">
                {result.isCorrect
                  ? "✅ Muito bem! Você acertou."
                  : "❌ Você errou esta questão."}
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                {result.explanation ?? "Resposta registrada."}
              </p>

              {showNext && (
                <button
                  type="button"
                  onClick={onNext}
                  className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
                >
                  Próxima questão →
                </button>
              )}

              {showSessionSummary && (
                <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5">
                  <p className="text-xl font-bold text-blue-400">
                    🎉 Revisão concluída!
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-800 p-4">
                      <p className="text-sm text-slate-400">Questões</p>
                      <p className="mt-1 text-2xl font-bold">{recordedCount}</p>
                    </div>
                    <div className="rounded-xl bg-slate-800 p-4">
                      <p className="text-sm text-slate-400">Acertos</p>
                      <p className="mt-1 text-2xl font-bold text-green-400">
                        {correctAnswers}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-800 p-4">
                      <p className="text-sm text-slate-400">Aproveitamento</p>
                      <p className="mt-1 text-2xl font-bold text-blue-400">
                        {Math.round((correctAnswers / recordedCount) * 100)}%
                      </p>
                    </div>
                  </div>
                  <p className="mt-5 text-sm text-slate-400">
                    Erros: {wrongAnswers}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={onGoReview}
                      className="inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white"
                    >
                      ← Voltar para revisão
                    </button>
                    <button
                      type="button"
                      onClick={onGoDashboard}
                      className="inline-flex rounded-xl border border-slate-600 bg-slate-800 px-6 py-3 font-semibold text-slate-200"
                    >
                      Voltar ao dashboard
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const CONFIRMING_FALLBACK =
  "Confirmando apresentação da questão. As alternativas serão habilitadas em instantes.";
