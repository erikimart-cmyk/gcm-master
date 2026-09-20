import { describe, expect, it } from "vitest";

import { toCanonicalQuestionResult } from "./toCanonicalQuestionResult";

describe("toCanonicalQuestionResult", () => {
  it("preserves dashboard-compatible fields without marking the attempt as review", () => {
    expect(
      toCanonicalQuestionResult({
        questionId: 42,
        subject: "Constitucional",
        topic: "Princípios",
        correct: true,
        answeredAt: "2026-09-20T00:00:00.000Z",
      }),
    ).toEqual({
      questionId: 42,
      subject: "Constitucional",
      topic: "Princípios",
      correct: true,
      answeredAt: "2026-09-20T00:00:00.000Z",
      isReview: false,
    });
  });
});
