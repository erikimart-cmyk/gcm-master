import type {
  DashboardProgress,
  DashboardState,
} from "../types/DashboardState";

export function getDashboardState(
  progress: DashboardProgress,
  hasPriorities: boolean,
): DashboardState {
  if (progress.questionsAnswered === 0) {
    return {
      accuracy: null,
      nextStep: {
        state: "initial",
        title: "Comece sua jornada",
        description:
          "Responda suas primeiras questões para acompanhar sua evolução.",
        actionLabel: "Começar estudando",
        actionPath: "/revisao/questoes",
      },
    };
  }

  const accuracy = Math.round(
    (progress.correctAnswers / progress.questionsAnswered) * 100,
  );

  if (!hasPriorities) {
    return {
      accuracy,
      nextStep: {
        state: "up-to-date",
        title: "Você está em dia! 🎉",
        description:
          "Continue praticando para manter seu desempenho atualizado.",
        actionLabel: "Continuar estudando",
        actionPath: "/revisao/questoes",
      },
    };
  }

  return {
    accuracy,
    nextStep: {
      state: "review",
      title: "Reforce seu ponto de atenção",
      description:
        "Faça uma revisão direcionada antes de avançar para novos conteúdos.",
      actionLabel: "Revisar agora",
      actionPath: "/revisao",
    },
  };
}
