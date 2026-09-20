import { describe, expect, it } from "vitest";

import { questions as staticQuestions } from "@/features/landing/data/questions";
import { assignNextQuestions } from "@/features/questions/repositories/QuestionCatalogRepository";
import { saveQuestionAttempt } from "@/features/study/repositories/StudyProgressRepository";
import CanonicalStudySessionSource from "@/features/landing/pages/Review/CanonicalStudySession.tsx?raw";
import CanonicalStudyRuntimeSource from "@/features/study/runtime/CanonicalStudyRuntime.ts?raw";
import CanonicalStudyRepositorySource from "@/features/study/repositories/CanonicalStudyRepository.ts?raw";
import CanonicalStudyTypesSource from "@/features/study/types/CanonicalStudy.ts?raw";
import QuestionsPageSource from "@/features/landing/pages/Review/QuestionsPage.tsx?raw";
import ReviewSessionSource from "@/features/landing/pages/Review/ReviewQuestionSession.tsx?raw";
import type { AnsweredQuestionResult } from "@/features/study/types/CanonicalStudy";
import type { DeliveredQuestion } from "@/features/study/types/CanonicalStudy";

describe("SG-RUNTIME canonical study cutover", () => {
  it("defines DeliveredQuestion without post-answer fields", () => {
    const sample: DeliveredQuestion = {
      assignmentId: "asg",
      questionVersionId: "qv",
      questionId: 9,
      statement: "s",
      alternatives: [
        { id: "A", text: "a" },
        { id: "B", text: "b" },
      ],
      difficulty: "easy",
      subjectLabel: "subject",
      topicLabel: "topic",
      presentationContext: "study",
    };
    expect(sample).not.toHaveProperty("correctAnswer");
    expect(sample).not.toHaveProperty("explanation");
    expect(sample).not.toHaveProperty("isCorrect");
    expect(sample).not.toHaveProperty("pCorrect");
    expect(CanonicalStudyTypesSource).toContain("assignmentId");
    expect(CanonicalStudyTypesSource).not.toMatch(
      /export type DeliveredQuestion = \{[^}]*correctAnswer/s,
    );
  });

  it("keeps AnsweredQuestionResult as the post-answer model", () => {
    const result: AnsweredQuestionResult = {
      assignmentId: "asg",
      attemptId: "att",
      selectedAnswer: "A",
      isCorrect: false,
      correctAnswer: null,
      explanation: null,
    };
    expect(result.isCorrect).toBe(false);
    expect(result.correctAnswer).toBeNull();
  });

  it("keeps legacy review writers available without using them in canonical study", () => {
    expect(typeof assignNextQuestions).toBe("function");
    expect(typeof saveQuestionAttempt).toBe("function");
    expect(staticQuestions.map((question) => question.id)).toEqual([1, 2, 3, 4, 5]);

    expect(CanonicalStudySessionSource).not.toContain("assignNextQuestions");
    expect(CanonicalStudySessionSource).not.toContain("saveQuestionAttempt");
    expect(CanonicalStudySessionSource).not.toContain("p_correct");
    expect(CanonicalStudySessionSource).not.toContain("assign_next_questions");
    expect(CanonicalStudyRuntimeSource).not.toContain("assignNextQuestions");
    expect(CanonicalStudyRuntimeSource).not.toContain("saveQuestionAttempt");
    expect(CanonicalStudyRuntimeSource).not.toContain("p_correct");
    expect(CanonicalStudyRepositorySource).not.toMatch(/\bp_correct\s*:/);
    expect(CanonicalStudyRepositorySource).toContain("DELIVERY_FORBIDDEN_KEYS");
    expect(CanonicalStudyRepositorySource).not.toContain("assign_next_questions");
    expect(CanonicalStudyRepositorySource).toContain("request_question_delivery");
    expect(CanonicalStudyRepositorySource).toContain("confirm_question_presentation");
    expect(CanonicalStudyRepositorySource).toContain("submit_question_response");
    expect(QuestionsPageSource).toContain("CanonicalStudySession");
    expect(QuestionsPageSource).toContain("ReviewQuestionSession");
    expect(QuestionsPageSource).not.toContain("assignNextQuestions");
    expect(ReviewSessionSource).toContain("loadAssignedReviewQuestions");
    expect(ReviewSessionSource).toContain("answerId === question.correctAnswer");
    expect(CanonicalStudyRuntimeSource).not.toContain(
      "answerId === question.correctAnswer",
    );
    expect(CanonicalStudySessionSource).not.toContain('?? "anonymous"');
    expect(CanonicalStudySessionSource).toContain("user.id");
    expect(CanonicalStudySessionSource).toContain("useAuth");
  });

  it("does not confirm inside delivery and requires confirmation before submit", () => {
    expect(CanonicalStudyRuntimeSource).toContain('phase === "READY"');
    expect(CanonicalStudyRuntimeSource).toContain("confirmedAssignmentId");
    expect(CanonicalStudyRuntimeSource).toContain("submitLocked");
    expect(CanonicalStudyRuntimeSource).toContain("persistPendingStudySubmission");
    expect(CanonicalStudyRuntimeSource).toContain("createSubmissionId");
  });
});
