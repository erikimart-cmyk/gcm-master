import { useNavigate } from "react-router-dom";

import { useStudyProgress } from "@/features/landing/context/StudyProgressContext";
import { limeiraGcmPilotExamId } from "@/features/questions/repositories/QuestionCatalogRepository";
import { GoalGrid } from "./GoalGrid";

export function WelcomeHero() {
  const navigate = useNavigate();
  const {
    studyGoal,
    isStudyGoalLoading,
    isStudyGoalSaving,
    studyTrack,
    setStudyTrack,
    isStudyTrackLoading,
    isStudyTrackSaving,
    studyTrackError,
  } = useStudyProgress();
  const requiresTrack = studyGoal?.id === "concursos";
  const isReadyToStart =
    Boolean(studyGoal) && (!requiresTrack || Boolean(studyTrack));

  return (
    <section className="mx-auto max-w-4xl text-center">

      <span className="inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1 text-sm text-violet-300">
        Bem-vindo à ZYNVO
      </span>

      <h1 className="mt-8 text-6xl font-black tracking-tight">
        Aprenda.
        <br />
        Evolua.
        <br />
        Conquiste.
      </h1>

      <p className="mt-8 text-lg leading-8 text-zinc-400">
        Você não entrou apenas em uma plataforma de estudos.
        <br />
        Você iniciou uma jornada para construir o seu futuro.
      </p>

      <button
        type="button"
        disabled={
          !isReadyToStart ||
          isStudyGoalLoading ||
          isStudyGoalSaving ||
          isStudyTrackLoading ||
          isStudyTrackSaving
        }
        onClick={() => {
          if (studyGoal) {
            navigate("/dashboard");
          }
        }}
        className="
        mt-12
        rounded-xl
        bg-violet-600
        px-8
        py-4
        text-lg
        font-semibold
        transition-all
        hover:bg-violet-500
        hover:scale-105
        active:scale-95
        disabled:cursor-not-allowed
        disabled:bg-violet-900
        disabled:text-zinc-400
        disabled:hover:scale-100
        "
      >
        Começar Minha Jornada
      </button>
      <GoalGrid />

      {requiresTrack && (
        <section className="mt-12 rounded-3xl border border-blue-500/20 bg-slate-900/70 p-6 text-left shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
            Sua trilha de concurso
          </p>
          <h2 className="mt-3 text-2xl font-bold text-white">
            Escolha o concurso para começar
          </h2>
          <p className="mt-3 text-slate-400">
            Este é o primeiro protótipo da ZYNVO. Novos concursos aparecerão aqui conforme o catálogo editorial crescer.
          </p>

          {studyTrackError && (
            <p className="mt-4 text-sm text-red-300" role="alert">
              {studyTrackError}
            </p>
          )}

          <button
            type="button"
            onClick={() => void setStudyTrack(limeiraGcmPilotExamId)}
            disabled={isStudyTrackLoading || isStudyTrackSaving}
            className={`mt-6 w-full rounded-2xl border p-5 text-left transition ${
              studyTrack?.examId === limeiraGcmPilotExamId
                ? "border-cyan-300 bg-cyan-400/10 shadow-[0_0_24px_rgba(34,211,238,0.12)]"
                : "border-slate-700 bg-slate-950/50 hover:border-blue-400/70"
            }`}
          >
            <p className="font-semibold text-white">
              Prefeitura de Limeira · Concurso Público 02/2026
            </p>
            <p className="mt-1 text-sm text-slate-300">
              Guarda Civil Municipal – 3ª Classe · AVANÇASP
            </p>
            <p className="mt-3 text-sm font-medium text-cyan-200">
              {studyTrack?.examId === limeiraGcmPilotExamId
                ? "✓ Trilha selecionada"
                : "Selecionar esta trilha"}
            </p>
          </button>
        </section>
      )}

    </section>
  );
}
