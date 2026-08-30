export type SubjectPerformance = {
  subject: string;

  questionsAnswered: number;
  correctAnswers: number;
  wrongAnswers: number;

  accuracy: number;

  priority: "low" | "medium" | "high";
};