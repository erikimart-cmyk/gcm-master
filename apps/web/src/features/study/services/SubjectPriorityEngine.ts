import type { SubjectPerformance } from "@/features/study/types/SubjectPerformance";

export function prioritizeSubjects(
  performances: SubjectPerformance[],
): SubjectPerformance[] {
  const priorityWeight = {
    high: 3,
    medium: 2,
    low: 1,
  };

  return performances
    .filter((performance) => performance.wrongAnswers > 0)
    .sort((a, b) => {
      const priorityDifference =
        priorityWeight[b.priority] - priorityWeight[a.priority];

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return a.accuracy - b.accuracy;
    });
}
