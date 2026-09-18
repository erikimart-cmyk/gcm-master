import { describe, expect, it } from "vitest";

import { questions as staticQuestions } from "@/features/landing/data/questions";
import { assignNextQuestions } from "@/features/questions/repositories/QuestionCatalogRepository";
import type { Question } from "@/features/questions/types/Question";
import { saveQuestionAttempt } from "@/features/study/repositories/StudyProgressRepository";

describe("M2A does not cut over legacy runtime", () => {
  it("does not remap static catalog ids 1-5 onto the database pilot", () => {
    expect(staticQuestions.map((question) => question.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it("keeps the client Question contract including correctAnswer until M2B", () => {
    const sample: Question = {
      id: 1001,
      country: "BR",
      language: "pt-BR",
      bankId: "avancasp",
      exam: "pilot",
      subject: "Matemática",
      difficulty: "easy",
      statement: "x",
      alternatives: [{ id: "A", text: "1" }],
      correctAnswer: "A",
      explanation: "e",
    };

    expect(sample.correctAnswer).toBe("A");
    expect(typeof assignNextQuestions).toBe("function");
    expect(typeof saveQuestionAttempt).toBe("function");
  });
});
