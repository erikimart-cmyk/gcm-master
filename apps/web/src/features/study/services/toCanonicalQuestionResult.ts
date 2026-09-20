import type { QuestionResult } from "@/features/questions/types/QuestionResult";

export function toCanonicalQuestionResult(input: {
  questionId: number;
  subject: string;
  topic?: string;
  correct: boolean;
  answeredAt: string;
}): QuestionResult {
  return {
    questionId: input.questionId,
    subject: input.subject,
    topic: input.topic,
    correct: input.correct,
    answeredAt: input.answeredAt,
    isReview: false,
  };
}
