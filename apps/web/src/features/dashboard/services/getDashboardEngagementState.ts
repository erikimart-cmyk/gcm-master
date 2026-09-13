import type { DashboardProgress } from "../types/DashboardState";
import type { DashboardEngagementState } from "../types/DashboardEngagementState";

export function getDashboardEngagementState(
  progress: DashboardProgress,
  prioritySubject?: string,
  pendingReviewCount = 0,
): DashboardEngagementState {
  if (progress.questionsAnswered === 0) {
    return {
      mission: {
        state: "first-step",
        eyebrow: "Sua primeira missão",
        title: "Responda 5 questões para iniciar sua jornada",
        description:
          "Suas primeiras respostas mostram onde concentrar seus próximos estudos.",
        actionLabel: "Começar estudando",
        actionPath: "/revisao/questoes",
      },
      narrative: {
        tone: "initial",
        title: "Sua evolução começa agora",
        description:
          "Responda suas primeiras questões para transformar estudo em acompanhamento real.",
      },
    };
  }

  if (prioritySubject) {
    return {
      mission: {
        state: "review",
        eyebrow: "Missão de hoje",
        title: `Reforce ${prioritySubject}`,
        description:
          "Uma revisão direcionada ajuda a transformar erros recentes em progresso.",
        actionLabel: "Revisar agora",
        actionPath: "/revisao",
      },
      narrative: {
        tone: "attention",
        title: `Você acertou ${progress.correctAnswers} de ${progress.questionsAnswered} ${progress.questionsAnswered === 1 ? "questão" : "questões"}`,
        description: `Há ${pendingReviewCount} ${pendingReviewCount === 1 ? "resposta para revisar" : "respostas para revisar"}. Um reforço direcionado pode consolidar seu aprendizado.`,
      },
    };
  }

  return {
    mission: {
      state: "practice",
      eyebrow: "Missão de hoje",
      title: "Mantenha seu ritmo com novas questões",
      description: `Você já respondeu ${progress.questionsAnswered} ${progress.questionsAnswered === 1 ? "questão" : "questões"}. Continue praticando para consolidar seu desempenho.`,
      actionLabel: "Continuar estudando",
      actionPath: "/revisao/questoes",
    },
    narrative: {
      tone: "positive",
      title: `Você acertou ${progress.correctAnswers} de ${progress.questionsAnswered} ${progress.questionsAnswered === 1 ? "questão" : "questões"}`,
      description:
        "Nenhuma resposta pendente de revisão agora. Continue praticando para fortalecer seu ritmo.",
    },
  };
}
