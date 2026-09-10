export type QuestionResult = {
  questionId: number;
  subject: string;
  topic?: string;
  correct: boolean;
  answeredAt: string;

  /**
   * Número da tentativa do aluno para esta questão.
   *
   * 1 = primeira tentativa
   * 2 = segunda tentativa
   * 3 = terceira tentativa
   */
  attempt?: number;

  /**
   * Indica se esta resposta aconteceu durante
   * uma sessão de revisão.
   */
  isReview?: boolean;
};
