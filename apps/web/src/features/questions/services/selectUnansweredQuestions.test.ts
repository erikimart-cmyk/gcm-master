import { describe, expect, it } from "vitest";

import { questions } from "@/features/landing/data/questions";
import { selectUnansweredQuestions } from "./selectUnansweredQuestions";

describe("selectUnansweredQuestions", () => {
  const candidates = questions.slice(0, 3);

  it("returns only questions that have never been answered", () => {
    const result = selectUnansweredQuestions(candidates, [
      {
        questionId: 2,
        subject: "Português",
        correct: true,
        answeredAt: "2026-09-04T10:00:00.000Z",
      },
    ]);

    expect(result.map((question) => question.id)).toEqual([1, 3]);
  });

  it("does not bring a question back after a review attempt", () => {
    const result = selectUnansweredQuestions(candidates, [
      {
        questionId: 1,
        subject: "Matemática",
        correct: false,
        answeredAt: "2026-09-04T10:00:00.000Z",
        isReview: true,
      },
    ]);

    expect(result.map((question) => question.id)).toEqual([2, 3]);
  });
});
