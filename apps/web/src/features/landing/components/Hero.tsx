import { Button } from "@/shared/components/ui/Button";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/features/auth/context/useAuth";
import { useStudyProgress } from "@/features/landing/context/StudyProgressContext";

import { DashboardPreview } from "./DashboardPreview";

export function Hero() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { studyGoal, isStudyGoalLoading, studyTrack, isStudyTrackLoading } =
    useStudyProgress();

  const highlights = [
    "Planos de estudo personalizados",
    "Prática com propósito",
    "Evolução que você acompanha",
  ];

  const isReturningStudent = Boolean(user);
  const needsTrackSelection = studyGoal?.id === "concursos" && !studyTrack;
  const destination = isReturningStudent
    ? studyGoal
      ? needsTrackSelection
        ? "/onboarding"
        : "/dashboard"
      : "/onboarding"
    : "/auth";
  const actionLabel = isReturningStudent
    ? !studyGoal
      ? "Escolher minha área →"
      : needsTrackSelection
        ? "Configurar minha jornada →"
        : "Continuar minha jornada →"
    : "Criar conta grátis →";

  return (
    <section className="relative isolate overflow-hidden py-20 sm:py-24 lg:py-32">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl animate-[pulse_7s_ease-in-out_infinite] motion-reduce:animate-none" />
        <div className="absolute -right-32 top-24 h-[30rem] w-[30rem] rounded-full bg-violet-600/20 blur-3xl animate-[pulse_9s_ease-in-out_infinite] motion-reduce:animate-none" />
        <div className="absolute left-1/2 top-1/2 h-[38rem] w-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-400/10 animate-[spin_40s_linear_infinite] motion-reduce:animate-none" />
      </div>

      <div className="mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/25 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 shadow-[0_0_32px_rgba(59,130,246,0.12)]">
            <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.95)]" />
            Sua evolução começa com uma escolha
          </span>

          <h1 className="mt-7 text-5xl font-black leading-[0.98] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Estude com direção.
            <span className="block bg-gradient-to-r from-blue-300 via-cyan-200 to-violet-300 bg-clip-text text-transparent">
              Evolua com propósito.
            </span>
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
            A ZYNVO transforma sua meta em uma jornada de prática, revisão e
            progresso real — no ritmo que faz sentido para você.
          </p>

          <div className="mt-10">
            <Button
              variant="primary"
              size="lg"
              className="min-w-56 bg-gradient-to-r from-blue-500 to-violet-600 shadow-[0_14px_40px_rgba(59,130,246,0.32)] hover:scale-[1.03] hover:from-blue-400 hover:to-violet-500"
              disabled={
                isReturningStudent &&
                (isStudyGoalLoading || isStudyTrackLoading)
              }
              onClick={() =>
                navigate(destination, {
                  state: isReturningStudent ? undefined : { mode: "sign-up" },
                })
              }
            >
              {isReturningStudent && isStudyGoalLoading
                ? "Preparando sua jornada..."
                : actionLabel}
            </Button>
          </div>
          
          <div className="mt-10 flex flex-wrap gap-3">
            {highlights.map((item) => (
              <span
                key={item}
                className="rounded-full border border-slate-700/80 bg-slate-900/55 px-4 py-2 text-sm text-slate-300 backdrop-blur"
              >
                ✦ {item}
              </span>
            ))}
          </div>

          <p className="mt-7 text-sm text-slate-500">
            {isReturningStudent
              ? "Sua jornada continua exatamente de onde você parou"
              : "Sem cartão de crédito · Escolha sua área de estudo depois de entrar"}
          </p>
        </div>
        <div className="flex justify-center lg:justify-end">
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}
