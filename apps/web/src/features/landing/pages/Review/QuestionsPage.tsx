import { useState } from "react";

import { useStudyProgress } from "@/features/landing/context/StudyProgressContext";
import { questions } from "@/features/landing/data/questions";

export function QuestionsPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);

  const { registerQuestionResult } = useStudyProgress();

  const question = questions[currentQuestion];

  const handleAnswer = (answerId: string) => {
    if (selectedAnswer !== null) {
      return;
    }

    setSelectedAnswer(answerId);

    const isCorrect =
      answerId === question.correctAnswer;

    registerQuestionResult(
      question.id,
      question.subject,
      isCorrect,
    );

    if (isCorrect) {
      setCorrectAnswers((current) => current + 1);
    } else {
      setWrongAnswers((current) => current + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
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
            <p className="text-sm text-blue-400">
              Revisão personalizada
            </p>

            <h1 className="mt-2 text-2xl font-bold">
              {question.subject}
            </h1>

            {question.topic && (
              <p className="mt-1 text-sm text-slate-400">
                {question.topic}
              </p>
            )}
          </div>

          <span className="rounded-full bg-slate-800 px-4 py-2 text-sm text-slate-300">
            Questão {currentQuestion + 1} de {questions.length}
          </span>
        </div>

        <div className="mb-8 h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{
              width: `${((currentQuestion + 1) / questions.length) * 100}%`,
            }}
          />
        </div>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl">

          <div className="mb-6 flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
              {question.bank}
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
              const isSelected =
                selectedAnswer === alternative.id;

              const isCorrect =
                question.correctAnswer === alternative.id;

              let className =
                "border-slate-700 bg-slate-800 hover:border-blue-500 hover:bg-slate-700";

              if (isAnswered && isCorrect) {
                className =
                  "border-green-500 bg-green-500/10";
              }

              if (
                isAnswered &&
                isSelected &&
                !isCorrect
              ) {
                className =
                  "border-red-500 bg-red-500/10";
              }

              return (
                <button
                  key={`${currentQuestion}-${alternative.id}`}
                  type="button"
                  onClick={() => handleAnswer(alternative.id)}
                  disabled={isAnswered}
                  className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${className}`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold">
                    {alternative.id}
                  </span>

                  <span className="text-slate-200">
                    {alternative.text}
                  </span>
                </button>
              );
            })}
          </div>

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

              {currentQuestion < questions.length - 1 && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
                >
                  Próxima questão →
                </button>
              )}

              {currentQuestion === questions.length - 1 && (
                <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5">

                  <p className="text-xl font-bold text-blue-400">
                    🎉 Revisão concluída!
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">

                    <div className="rounded-xl bg-slate-800 p-4">
                      <p className="text-sm text-slate-400">
                        Questões
                      </p>

                      <p className="mt-1 text-2xl font-bold">
                        {questions.length}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-800 p-4">
                      <p className="text-sm text-slate-400">
                        Acertos
                      </p>

                      <p className="mt-1 text-2xl font-bold text-green-400">
                        {correctAnswers}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-800 p-4">
                      <p className="text-sm text-slate-400">
                        Aproveitamento
                      </p>

                      <p className="mt-1 text-2xl font-bold text-blue-400">
                        {Math.round(
                          (correctAnswers / questions.length) * 100,
                        )}%
                      </p>
                    </div>

                  </div>

                  <p className="mt-5 text-sm text-slate-400">
                    Erros: {wrongAnswers}
                  </p>

                </div>
              )}

            </div>
          )}

        </section>

      </div>
    </main>
  );
}