import type { Question } from "@/features/questions/types/Question";
import type { QuestionResult } from "@/features/questions/types/QuestionResult";

export function selectReviewQuestions(
  questions: Question[],
  results: QuestionResult[],
): Question[] {
  const latestResults = new Map<number, QuestionResult>();

  for (const result of results) {
    latestResults.set(result.questionId, result);
  }

  const wrongQuestionIds = new Set(
    Array.from(latestResults.values())
      .filter((result) => !result.correct)
      .map((result) => result.questionId),
  );

  return questions.filter((question) =>
    wrongQuestionIds.has(question.id),
  );
}