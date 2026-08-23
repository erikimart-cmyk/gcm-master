import { useState } from "react";
import { useStudyProgress } from "@/features/landing/context/StudyProgressContext";

import { questions } from "@/features/landing/data/questions";

export function QuestionsPage() {

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);

  const { registerQuestionResult } = useStudyProgress();

  const question = questions[currentQuestion];

  const handleAnswer = (answerIndex: number) => {
  if (selectedAnswer !== null) {
    return;
  }

  setSelectedAnswer(answerIndex);

  const isCorrect = answerIndex === question.correctAnswer;

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
      setCurrentQuestion(currentQuestion + 1);
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

          <h2 className="text-xl font-semibold leading-8">
            {question.statement}
          </h2>

          <div className="mt-8 space-y-4">
            {question.alternatives.map((alternative, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = question.correctAnswer === index;

              let className =
                "border-slate-700 bg-slate-800 hover:border-blue-500 hover:bg-slate-700";

              if (isAnswered && isCorrect) {
                className =
                  "border-green-500 bg-green-500/10";
              }

              if (isAnswered && isSelected && !isCorrect) {
                className =
                  "border-red-500 bg-red-500/10";
              }

              return (
                <button
                  key={`${currentQuestion}-${index}-${alternative}`}
                  type="button"
                  onClick={() => handleAnswer(index)}
                  className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${className}`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold">
                    {String.fromCharCode(65 + index)}
                  </span>

                  <span className="text-slate-200">
                    {alternative}
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
                  : "❌ Vamos aprender com esse erro."}
              </p>

              <p className="mt-3 text-sm leading-6 text-slate-300">
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
            (correctAnswers / questions.length) * 100
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