import { useNavigate } from "react-router-dom";

import { useStudyProgress } from "@/features/landing/context/StudyProgressContext";
import { GoalGrid } from "./GoalGrid";

export function WelcomeHero() {
  const navigate = useNavigate();
  const { studyGoal, isStudyGoalLoading, isStudyGoalSaving } =
    useStudyProgress();

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
        disabled={!studyGoal || isStudyGoalLoading || isStudyGoalSaving}
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

    </section>
  );
}
