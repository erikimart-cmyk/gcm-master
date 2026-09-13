import type { QuestionResult } from "@/features/questions/types/QuestionResult";

import type { StudyLevel, StudyLevelProgress } from "../types/StudyLevel";

function getEarnedRank(
  questionsAnswered: number,
  accuracy: number,
): StudyLevel["rank"] {
  if (questionsAnswered >= 200 && accuracy >= 85) return 4;
  if (questionsAnswered >= 80 && accuracy >= 80) return 3;
  if (questionsAnswered >= 30 && accuracy >= 70) return 2;
  if (questionsAnswered >= 10) return 1;
  return 0;
}

function getNextMilestone(
  rank: StudyLevel["rank"],
  questionsAnswered: number,
): string | null {
  if (rank === 4) return null;

  const milestones = [
    { volume: 10, accuracy: null, title: "nível em desenvolvimento" },
    { volume: 30, accuracy: 70, title: "nível intermediário" },
    { volume: 80, accuracy: 80, title: "nível avançado" },
    { volume: 200, accuracy: 85, title: "nível de prática profissional" },
  ] as const;
  const milestone = milestones[rank];

  if (questionsAnswered >= milestone.volume && milestone.accuracy !== null) {
    return `Alcance ${milestone.accuracy}% de aproveitamento para chegar ao ${milestone.title}.`;
  }

  if (milestone.accuracy === null) {
    return `Responda ${milestone.volume} questões para avançar ao ${milestone.title}.`;
  }

  return `Alcance ${milestone.volume} questões respondidas com pelo menos ${milestone.accuracy}% de aproveitamento para chegar ao ${milestone.title}.`;
}

export function getStudyLevel(
  progress: StudyLevelProgress,
  minimumRank: StudyLevel["rank"] = 0,
): StudyLevel {
  const accuracy =
    progress.questionsAnswered === 0
      ? 0
      : (progress.correctAnswers / progress.questionsAnswered) * 100;

  const rank = Math.max(
    minimumRank,
    getEarnedRank(progress.questionsAnswered, accuracy),
  ) as StudyLevel["rank"];

  if (rank === 4) {
    return {
      rank: 4,
      title: "Prática profissional",
      description:
        "Você demonstra constância e alto aproveitamento na sua prática na ZYNVO.",
      nextMilestone: null,
    };
  }

  if (rank === 3) {
    return {
      rank: 3,
      title: "Avançado",
      description:
        "Sua prática já combina volume consistente e bom aproveitamento.",
      nextMilestone: getNextMilestone(rank, progress.questionsAnswered),
    };
  }

  if (rank === 2) {
    return {
      rank: 2,
      title: "Intermediário",
      description:
        "Você já construiu uma base de respostas consistente para evoluir com confiança.",
      nextMilestone: getNextMilestone(rank, progress.questionsAnswered),
    };
  }

  if (rank === 1) {
    return {
      rank: 1,
      title: "Em desenvolvimento",
      description:
        "Você saiu do primeiro contato e já está criando ritmo de prática.",
      nextMilestone: getNextMilestone(rank, progress.questionsAnswered),
    };
  }

  return {
    rank: 0,
    title: "Iniciante",
    description:
      "Toda evolução começa com as primeiras respostas e uma rotina possível de manter.",
    nextMilestone: getNextMilestone(rank, progress.questionsAnswered),
  };
}

export function getHighestStudyLevel(results: QuestionResult[]): StudyLevel {
  let correctAnswers = 0;
  let highestRank: StudyLevel["rank"] = 0;

  results.forEach((result, index) => {
    if (result.correct) correctAnswers += 1;
    highestRank = getStudyLevel(
      {
        questionsAnswered: index + 1,
        correctAnswers,
        wrongAnswers: index + 1 - correctAnswers,
      },
      highestRank,
    ).rank;
  });

  return getStudyLevel(
    {
      questionsAnswered: results.length,
      correctAnswers,
      wrongAnswers: results.length - correctAnswers,
    },
    highestRank,
  );
}
