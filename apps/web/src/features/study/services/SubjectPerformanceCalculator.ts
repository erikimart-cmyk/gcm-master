import type { QuestionResult } from "@/features/questions/types/QuestionResult";
import type { SubjectPerformance } from "@/features/study/types/SubjectPerformance";

function calculatePriority(accuracy: number): SubjectPerformance["priority"] {
  if (accuracy < 60) {
    return "high";
  }

  if (accuracy < 80) {
    return "medium";
  }

  return "low";
}

export function calculateSubjectPerformance(
  results: QuestionResult[],
): SubjectPerformance[] {
  const latestResults = new Map<number, QuestionResult>();

  for (const result of results) {
    latestResults.set(result.questionId, result);
  }

  const subjects = new Map<
    string,
    {
      questionsAnswered: number;
      correctAnswers: number;
      wrongAnswers: number;
    }
  >();

  for (const result of latestResults.values()) {
    const current = subjects.get(result.subject) ?? {
      questionsAnswered: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
    };

    subjects.set(result.subject, {
      questionsAnswered: current.questionsAnswered + 1,

      correctAnswers: current.correctAnswers + (result.correct ? 1 : 0),

      wrongAnswers: current.wrongAnswers + (result.correct ? 0 : 1),
    });
  }

  return Array.from(subjects.entries()).map(([subject, data]) => {
    const accuracy =
      data.questionsAnswered === 0
        ? 0
        : Math.round((data.correctAnswers / data.questionsAnswered) * 100);

    return {
      subject,
      questionsAnswered: data.questionsAnswered,

      correctAnswers: data.correctAnswers,

      wrongAnswers: data.wrongAnswers,

      accuracy,

      priority: calculatePriority(accuracy),
    };
  });
}
