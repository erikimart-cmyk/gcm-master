import { Link, useSearchParams } from "react-router-dom";

import { useStudyProgress } from "@/features/landing/context/StudyProgressContext";
import { CanonicalStudySession } from "@/features/landing/pages/Review/CanonicalStudySession";
import { ReviewQuestionSession } from "@/features/landing/pages/Review/ReviewQuestionSession";

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

  if (reviewMode) {
    return <ReviewQuestionSession key="review" />;
  }

  return <CanonicalStudySession key="study" />;
}
