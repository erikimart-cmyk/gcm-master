import { describe, expect, it } from "vitest";

import { questions as staticQuestions } from "@/features/landing/data/questions";
import { assignNextQuestions } from "@/features/questions/repositories/QuestionCatalogRepository";
import { saveQuestionAttempt } from "@/features/study/repositories/StudyProgressRepository";

describe("M2B.1 does not cut over legacy delivery", () => {
  it("keeps static catalog ids 1-5 unmapped to the DB pilot", () => {
    expect(staticQuestions.map((question) => question.id)).toEqual([1, 2, 3, 4, 5]);
    expect(staticQuestions.some((question) => question.id >= 1001)).toBe(false);
  });

  it("leaves assignNextQuestions and saveQuestionAttempt in place", () => {
    expect(typeof assignNextQuestions).toBe("function");
    expect(typeof saveQuestionAttempt).toBe("function");
  });
});
