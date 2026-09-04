import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Question } from "@/features/questions/types/Question";

import { useStudyProgress } from "@/features/landing/context/StudyProgressContext";
import { questions } from "@/features/landing/data/questions";
import { examBanks } from "@/features/questions/data/banks";

export function QuestionsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const reviewMode = searchParams.get("mode") === "errors";

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerSaving, setIsAnswerSaving] = useState(false);

  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);

  const {
    registerQuestionResult,
    reviewQuestions,
    isProgressLoading,
    isQuestionResultSaving,
    progressError,
  } = useStudyProgress();

  const [sessionQuestions] = useState<Question[]>(() =>
    reviewMode ? [...reviewQuestions] : questions,
  );

  const activeQuestions = sessionQuestions;

  const question = activeQuestions[currentQuestion];
  if (!question) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
              Revisão inteligente
            </p>

            <h1 className="mt-3 text-3xl font-bold">
              Nenhum erro para revisar
            </h1>

            <p className="mt-4 text-slate-400">
              Você não possui questões erradas disponíveis para esta revisão.
            </p>
          </div>
        </div>
      </main>
    );
  }
  const bank = examBanks.find((item) => item.id === question.bankId);

  const handleAnswer = async (answerId: string) => {
    if (
      selectedAnswer !== null ||
      isAnswerSaving ||
      isQuestionResultSaving ||
      isProgressLoading
    ) {
      return;
    }

    const isCorrect = answerId === question.correctAnswer;
    setIsAnswerSaving(true);

    const wasSaved = await registerQuestionResult(
      question.id,
      question.subject,
      isCorrect,
      reviewMode,
    );

    setIsAnswerSaving(false);

    if (!wasSaved) {
      return;
    }

    setSelectedAnswer(answerId);

    if (isCorrect) {
      setCorrectAnswers((current) => current + 1);
    } else {
      setWrongAnswers((current) => current + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion < activeQuestions.length - 1) {
      setCurrentQuestion((current) => current + 1);
      setSelectedAnswer(null);
    }
  };

  const isAnswered = selectedAnswer !== null;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-blue-400">Revisão personalizada</p>

            <h1 className="mt-2 text-2xl font-bold">{question.subject}</h1>

            {question.topic && (
              <p className="mt-1 text-sm text-slate-400">{question.topic}</p>
            )}
          </div>

          <span className="rounded-full bg-slate-800 px-4 py-2 text-sm text-slate-300">
            Questão {currentQuestion + 1} de {activeQuestions.length}
          </span>
        </div>

        <div className="mb-8 h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{
              width: `${((currentQuestion + 1) / activeQuestions.length) * 100}%`,
            }}
          />
        </div>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl">
          <div className="mb-6 flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
              {bank?.name ?? question.bankId}
            </span>

            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-400">
              {question.exam}
            </span>

            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-400">
              {question.difficulty === "easy"
                ? "Fácil"
                : question.difficulty === "medium"
                  ? "Média"
                  : "Difícil"}
            </span>
          </div>

          <h2 className="text-xl font-semibold leading-8">
            {question.statement}
          </h2>

          <div className="mt-8 space-y-4">
            {question.alternatives.map((alternative) => {
              const isSelected = selectedAnswer === alternative.id;

              const isCorrect = question.correctAnswer === alternative.id;

              let className =
                "border-slate-700 bg-slate-800 hover:border-blue-500 hover:bg-slate-700";

              if (isAnswered && isCorrect) {
                className = "border-green-500 bg-green-500/10";
              }

              if (isAnswered && isSelected && !isCorrect) {
                className = "border-red-500 bg-red-500/10";
              }

              return (
                <button
                  key={`${currentQuestion}-${alternative.id}`}
                  type="button"
                  onClick={() => void handleAnswer(alternative.id)}
                  disabled={
                    isAnswered ||
                    isAnswerSaving ||
                    isQuestionResultSaving ||
                    isProgressLoading
                  }
                  className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${className}`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold">
                    {alternative.id}
                  </span>

                  <span className="text-slate-200">{alternative.text}</span>
                </button>
              );
            })}
          </div>

          {isProgressLoading && (
            <p className="mt-4 text-sm text-slate-400">
              Carregando seu histórico de estudos...
            </p>
          )}

          {progressError && (
            <p className="mt-4 text-sm text-red-300" role="alert">
              {progressError}
            </p>
          )}

          {isAnswered && (
            <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-800/70 p-5">
              <p className="font-semibold">
                {selectedAnswer === question.correctAnswer
                  ? "✅ Muito bem! Você acertou."
                  : "❌ Você errou esta questão."}
              </p>

              <p className="mt-3 text-sm leading-7 text-slate-300">
                {question.explanation}
              </p>

              {currentQuestion < activeQuestions.length - 1 && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
                >
                  Próxima questão →
                </button>
              )}

              {currentQuestion === activeQuestions.length - 1 && (
                <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5">
                  <p className="text-xl font-bold text-blue-400">
                    🎉 Revisão concluída!
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-800 p-4">
                      <p className="text-sm text-slate-400">Questões</p>

                      <p className="mt-1 text-2xl font-bold">
                        {activeQuestions.length}
                      </p>
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
                        {Math.round(
                          (correctAnswers / activeQuestions.length) * 100,
                        )}
                        %
                      </p>
                    </div>
                  </div>

                  <p className="mt-5 text-sm text-slate-400">
                    Erros: {wrongAnswers}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => navigate("/revisao")}
                      className="inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-500"
                    >
                      ← Voltar para revisão
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate("/revisao/questoes")}
                      className="inline-flex rounded-xl border border-slate-600 bg-slate-800 px-6 py-3 font-semibold text-slate-200 transition hover:border-blue-500 hover:text-white"
                    >
                      Refazer questões
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
