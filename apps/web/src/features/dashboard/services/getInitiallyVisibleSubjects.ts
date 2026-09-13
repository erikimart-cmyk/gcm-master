import type { SubjectPerformance } from "@/features/study/types/SubjectPerformance";

export function getInitiallyVisibleSubjects(
  subjects: SubjectPerformance[],
  prioritySubject?: string,
) {
  const firstSubjects = subjects.slice(0, 3);
  const priority = subjects.find(
    (subject) => subject.subject === prioritySubject,
  );

  if (!priority || firstSubjects.includes(priority)) return firstSubjects;

  return [...firstSubjects.slice(0, 2), priority];
}
