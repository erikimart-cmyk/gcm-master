import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { Question } from "@/features/questions/types/Question";

import { useStudyProgress } from "@/features/landing/context/StudyProgressContext";
import { examBanks } from "@/features/questions/data/banks";
import {
  assignNextQuestions,
  loadAssignedReviewQuestions,
} from "@/features/questions/repositories/QuestionCatalogRepository";
import type { StudyLevel } from "@/features/study/types/StudyLevel";

export function QuestionsPage() {
  const [searchParams] = useSearchParams();
  const reviewMode = searchParams.get("mode") === "errors";
  const {
    isProgressLoading,
    studyGoal,
    studyTrack,
    isStudyTrackLoading,
    studyTrackError,
  } = useStudyProgress();

  if (isProgressLoading || isStudyTrackLoading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
          <p className="text-slate-300" role="status">
            Preparando suas próximas questões...
          </p>
        </div>
      </main>
    );
  }

  if (
    !reviewMode &&
    studyGoal?.id === "concursos" &&
    (!studyTrack || studyTrackError)
  ) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-amber-500/30 bg-slate-900 p-8 text-center">
          <h1 className="text-2xl font-bold">
            Selecione sua trilha de concurso
          </h1>
          <p
            className="mt-4 text-slate-300"
            role={studyTrackError ? "alert" : undefined}
          >
            {studyTrackError ??
              "Precisamos da sua trilha para preparar questões compatíveis com o concurso escolhido."}
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

  return (
    <QuestionSession
      key={reviewMode ? "review" : "study"}
      reviewMode={reviewMode}
      examId={studyTrack?.examId}
    />
  );
}

function QuestionSession({
  reviewMode,
  examId,
}: {
  reviewMode: boolean;
  examId?: string;
}) {
  const navigate = useNavigate();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerSaving, setIsAnswerSaving] = useState(false);
  const [levelUp, setLevelUp] = useState<StudyLevel | null>(null);

  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);

  const {
    registerQuestionResult,
    reviewQuestions,
    isProgressLoading,
    isQuestionResultSaving,
    progressError,
  } = useStudyProgress();
  const [initialReviewQuestions] = useState(() => reviewQuestions);

  const [sessionQuestions, setSessionQuestions] = useState<Question[]>(() =>
    reviewMode ? [...initialReviewQuestions] : [],
  );
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    const loadSession = reviewMode
      ? loadAssignedReviewQuestions().then((assignedQuestions) => {
          const assignedQuestionIds = new Set(
            assignedQuestions.map((question) => question.id),
          );
          setSessionQuestions([
            ...initialReviewQuestions.filter(
              (question) => !assignedQuestionIds.has(question.id),
            ),
            ...assignedQuestions,
          ]);
        })
      : examId
        ? assignNextQuestions(examId).then((assignedQuestions) => {
            setSessionQuestions(assignedQuestions);
          })
        : Promise.reject(
            new Error("Nenhuma trilha de concurso foi selecionada."),
          );

    void loadSession
      .catch(() => {
        if (reviewMode && initialReviewQuestions.length > 0) {
          return;
        }

        setSessionError(
          "Não foi possível preparar suas questões novas. Tente novamente.",
        );
      })
      .finally(() => {
        setIsSessionLoading(false);
      });
  }, [examId, initialReviewQuestions, reviewMode]);

  const activeQuestions = sessionQuestions;

  const question = activeQuestions[currentQuestion];
  if (isSessionLoading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
          <p className="text-slate-300" role="status">
            Preparando suas questões novas...
          </p>
        </div>
      </main>
    );
  }

  if (sessionError) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-500/30 bg-slate-900 p-8 text-center">
          <p className="text-red-200" role="alert">
            {sessionError}
          </p>
        </div>
      </main>
    );
  }
  if (!question) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
              Revisão inteligente
            </p>

            <h1 className="mt-3 text-3xl font-bold">
              {reviewMode
                ? "Nenhum erro para revisar"
                : "Você concluiu as questões novas disponíveis"}
            </h1>

            <p className="mt-4 text-slate-400">
              {reviewMode
                ? "Você não possui questões erradas disponíveis para esta revisão."
                : "Não vamos repetir conteúdo como se fosse novo. Volte mais tarde quando houver novas questões no catálogo ou revise seus pontos de atenção."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
                to="/revisao"
              >
                {reviewMode ? "Voltar para revisão" : "Ir para revisão"}
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

    const registration = await registerQuestionResult(
      question.id,
      question.subject,
      isCorrect,
      reviewMode,
      question.topic,
    );

    setIsAnswerSaving(false);

    if (!registration.saved) {
      return;
    }

    setSelectedAnswer(answerId);
    setLevelUp(registration.levelUp);

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
      setLevelUp(null);
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

        <div
          aria-label="Progresso da sessão de questões"
          aria-valuemax={activeQuestions.length}
          aria-valuemin={0}
          aria-valuenow={currentQuestion + 1}
          className="mb-8 h-2 overflow-hidden rounded-full bg-slate-800"
          role="progressbar"
        >
          <div
            className="h-full rounded-full bg-blue-500 transition-all motion-reduce:transition-none"
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
            <p className="mt-4 text-sm text-slate-400" role="status">
              Carregando seu histórico de estudos...
            </p>
          )}

          {progressError && (
            <p className="mt-4 text-sm text-red-300" role="alert">
              {progressError}
            </p>
          )}

          {levelUp && (
            <div
              className="mt-4 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4"
              role="status"
            >
              <p className="font-semibold text-violet-200">
                Você avançou para {levelUp.title}! ✦
              </p>
              <p className="mt-1 text-sm text-slate-200">
                {levelUp.description}
              </p>
            </div>
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
                      Buscar novas questões
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
