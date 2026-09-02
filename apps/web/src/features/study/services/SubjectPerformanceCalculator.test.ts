import { describe, expect, it } from "vitest";

import { calculateSubjectPerformance } from "./SubjectPerformanceCalculator";

describe("calculateSubjectPerformance", () => {
  it("considera apenas a última tentativa de cada questão", () => {
    const results = [
      {
        questionId: 1,
        subject: "Direito Constitucional",
        correct: false,
        answeredAt: "2026-08-31T20:00:00.000Z",
        attempt: 1,
        isReview: false,
      },
      {
        questionId: 2,
        subject: "Direito Constitucional",
        correct: false,
        answeredAt: "2026-08-31T20:01:00.000Z",
        attempt: 1,
        isReview: false,
      },
      {
        questionId: 1,
        subject: "Direito Constitucional",
        correct: false,
        answeredAt: "2026-08-31T20:05:00.000Z",
        attempt: 2,
        isReview: true,
      },
    ];

    const performance = calculateSubjectPerformance(results);

    expect(performance).toEqual([
      {
        subject: "Direito Constitucional",
        questionsAnswered: 2,
        correctAnswers: 0,
        wrongAnswers: 2,
        accuracy: 0,
        priority: "high",
      },
    ]);
  });

  it("considera a última tentativa correta como desempenho atual", () => {
    const results = [
      {
        questionId: 1,
        subject: "Português",
        correct: false,
        answeredAt: "2026-08-31T20:00:00.000Z",
        attempt: 1,
        isReview: false,
      },
      {
        questionId: 1,
        subject: "Português",
        correct: true,
        answeredAt: "2026-08-31T20:05:00.000Z",
        attempt: 2,
        isReview: true,
      },
    ];

    const performance = calculateSubjectPerformance(results);

    expect(performance).toEqual([
      {
        subject: "Português",
        questionsAnswered: 1,
        correctAnswers: 1,
        wrongAnswers: 0,
        accuracy: 100,
        priority: "low",
      },
    ]);
  });
});
