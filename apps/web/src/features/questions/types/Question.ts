export type QuestionDifficulty =
  | "easy"
  | "medium"
  | "hard";

export type QuestionAlternative = {
  id: string;
  text: string;
};

export type Question = {
  id: number;

  country: string;
  language: string;

  bank: string;
  exam: string;
  position?: string;
  year?: number;

  subject: string;
  topic?: string;

  difficulty: QuestionDifficulty;

  statement: string;
  alternatives: QuestionAlternative[];

  correctAnswer: string;

  explanation: string;

  tags?: string[];
};