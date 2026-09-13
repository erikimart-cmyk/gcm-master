export type StudyLevelProgress = {
  questionsAnswered: number;
  correctAnswers: number;
  wrongAnswers: number;
};

export type StudyLevel = {
  rank: 0 | 1 | 2 | 3 | 4;
  title:
    | "Iniciante"
    | "Em desenvolvimento"
    | "Intermediário"
    | "Avançado"
    | "Prática profissional";
  description: string;
  nextMilestone: string | null;
};
