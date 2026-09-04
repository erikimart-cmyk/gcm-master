import { describe, expect, it } from "vitest";

import { hydrateQuestionResults } from "./hydrateQuestionResults";

describe("hydrateQuestionResults", () => {
  it("preserves each persisted study fact for the existing calculators", () => {
    expect(
      hydrateQuestionResults([
        {
          questionId: 4,
          subject: "Português",
          correct: false,
          answeredAt: "2026-09-04T10:00:00.000Z",
          attempt: 2,
          isReview: true,
        },
      ]),
    ).toEqual([
      {
        questionId: 4,
        subject: "Português",
        correct: false,
        answeredAt: "2026-09-04T10:00:00.000Z",
        attempt: 2,
        isReview: true,
      },
    ]);
  });
});
