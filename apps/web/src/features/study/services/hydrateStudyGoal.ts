import { findStudyGoal, type StudyGoal } from "../types/StudyGoal";

export function hydrateStudyGoal(goalId: string | null): StudyGoal | null {
  return goalId ? findStudyGoal(goalId) : null;
}
