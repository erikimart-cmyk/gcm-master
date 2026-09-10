import type { Question } from "../types/Question";
import type { QuestionResult } from "../types/QuestionResult";

export function selectUnansweredQuestions(
  questions: Question[],
  results: QuestionResult[],
): Question[] {
  const answeredQuestionIds = new Set(
    results.map((result) => result.questionId),
  );

  return questions.filter((question) => !answeredQuestionIds.has(question.id));
}
