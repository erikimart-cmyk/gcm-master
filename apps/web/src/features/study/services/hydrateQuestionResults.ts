import type { QuestionResult } from "@/features/questions/types/QuestionResult";

import type { PersistedQuestionResult } from "../repositories/StudyProgressRepository";

export function hydrateQuestionResults(
  attempts: PersistedQuestionResult[],
): QuestionResult[] {
  return attempts.map((attempt) => ({
    questionId: attempt.questionId,
    subject: attempt.subject,
    correct: attempt.correct,
    answeredAt: attempt.answeredAt,
    attempt: attempt.attempt,
    isReview: attempt.isReview,
  }));
}
