export type QuestionFilter = {
  bankId?: string;
  exam?: string;
  position?: string;
  subject?: string;
  topic?: string;
  difficulty?: "easy" | "medium" | "hard";
  tags?: string[];
};