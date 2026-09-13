import { describe, expect, it } from "vitest";

import type { SubjectPerformance } from "@/features/study/types/SubjectPerformance";
import { getInitiallyVisibleSubjects } from "../services/getInitiallyVisibleSubjects";

const subjects: SubjectPerformance[] = [
  {
    subject: "A",
    questionsAnswered: 1,
    correctAnswers: 1,
    wrongAnswers: 0,
    accuracy: 100,
    priority: "low",
  },
  {
    subject: "B",
    questionsAnswered: 1,
    correctAnswers: 1,
    wrongAnswers: 0,
    accuracy: 100,
    priority: "low",
  },
  {
    subject: "C",
    questionsAnswered: 1,
    correctAnswers: 1,
    wrongAnswers: 0,
    accuracy: 100,
    priority: "low",
  },
  {
    subject: "Prioritária",
    questionsAnswered: 1,
    correctAnswers: 0,
    wrongAnswers: 1,
    accuracy: 0,
    priority: "high",
  },
];

describe("getInitiallyVisibleSubjects", () => {
  it("mantém a principal prioridade entre as três disciplinas visíveis", () => {
    expect(
      getInitiallyVisibleSubjects(subjects, "Prioritária").map(
        (subject) => subject.subject,
      ),
    ).toEqual(["A", "B", "Prioritária"]);
  });
});
