import type { Question } from "@/features/questions/types/Question";
import type { QuestionFilter } from "@/features/questions/types/QuestionFilter";

export function selectQuestions(
  questions: Question[],
  filter: QuestionFilter,
): Question[] {
  return questions.filter((question) => {
    if (
      filter.bankId &&
      question.bankId !== filter.bankId
    ) {
      return false;
    }

    if (
      filter.exam &&
      question.exam !== filter.exam
    ) {
      return false;
    }

    if (
      filter.position &&
      question.position !== filter.position
    ) {
      return false;
    }

    if (
      filter.subject &&
      question.subject !== filter.subject
    ) {
      return false;
    }

    if (
      filter.topic &&
      question.topic !== filter.topic
    ) {
      return false;
    }

    if (
      filter.difficulty &&
      question.difficulty !== filter.difficulty
    ) {
      return false;
    }

    if (filter.tags?.length) {
      const hasAllTags = filter.tags.every((tag) =>
        question.tags?.includes(tag),
      );

      if (!hasAllTags) {
        return false;
      }
    }

    return true;
  });
}