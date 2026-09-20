import { describe, expect, it } from "vitest";

import { assignNextQuestions } from "@/features/questions/repositories/QuestionCatalogRepository";
import { saveQuestionAttempt } from "@/features/study/repositories/StudyProgressRepository";

describe("M2B.2 does not cut over legacy delivery", () => {
  it("leaves assignNextQuestions and saveQuestionAttempt in place", () => {
    expect(typeof assignNextQuestions).toBe("function");
    expect(typeof saveQuestionAttempt).toBe("function");
  });
});
