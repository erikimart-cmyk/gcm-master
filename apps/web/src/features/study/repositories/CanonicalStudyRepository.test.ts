import { beforeEach, describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({
  getClient: vi.fn(),
}));

vi.mock("@/features/auth/lib/supabase", () => ({
  getSupabaseClient: supabase.getClient,
}));

import {
  CanonicalStudyTransportError,
  confirmPresentation,
  requestStudyQuestion,
  submitResponse,
} from "./CanonicalStudyRepository";

const deliveredRow = {
  outcome: "DELIVERED",
  assignment_id: "11111111-1111-1111-1111-111111111111",
  question_version_id: "22222222-2222-2222-2222-222222222222",
  question_id: 42,
  statement: "Qual é a alternativa segura?",
  alternatives: [
    { id: "A", text: "Uma" },
    { id: "B", text: "Outra" },
  ],
  difficulty: "medium",
  subject_label: "Constitucional",
  topic_label: "Princípios",
  presentation_context: "study",
};

describe("CanonicalStudyRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps a DELIVERED row to DeliveredQuestion without key or explanation", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [deliveredRow], error: null });
    supabase.getClient.mockReturnValue({ rpc });

    await expect(requestStudyQuestion()).resolves.toEqual({
      kind: "DELIVERED",
      question: {
        assignmentId: deliveredRow.assignment_id,
        questionVersionId: deliveredRow.question_version_id,
        questionId: 42,
        statement: deliveredRow.statement,
        alternatives: deliveredRow.alternatives,
        difficulty: "medium",
        subjectLabel: "Constitucional",
        topicLabel: "Princípios",
        presentationContext: "study",
      },
    });

    expect(rpc).toHaveBeenCalledWith("request_question_delivery", {
      p_delivery_context: "study",
    });
  });

  it("rejects a leaked gabarito on delivery instead of storing it", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ ...deliveredRow, correct_answer: "B", explanation: "segredo" }],
      error: null,
    });
    supabase.getClient.mockReturnValue({ rpc });

    await expect(requestStudyQuestion()).resolves.toEqual({
      kind: "UNAVAILABLE",
    });
  });

  it("handles UNAVAILABLE, CONTEXT_NOT_READY and DENIED as closed unions", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ outcome: "UNAVAILABLE" }], error: null })
      .mockResolvedValueOnce({
        data: [{ outcome: "CONTEXT_NOT_READY" }],
        error: null,
      })
      .mockResolvedValueOnce({ data: [{ outcome: "DENIED" }], error: null });
    supabase.getClient.mockReturnValue({ rpc });

    await expect(requestStudyQuestion()).resolves.toEqual({ kind: "UNAVAILABLE" });
    await expect(requestStudyQuestion()).resolves.toEqual({
      kind: "CONTEXT_NOT_READY",
    });
    await expect(requestStudyQuestion()).resolves.toEqual({ kind: "DENIED" });
  });

  it("treats RPC transport failures as retryable errors", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "network down" },
    });
    supabase.getClient.mockReturnValue({ rpc });

    await expect(requestStudyQuestion()).rejects.toBeInstanceOf(
      CanonicalStudyTransportError,
    );
  });

  it("confirms presentation for the exact assignment", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          outcome: "CONFIRMED",
          assignment_id: deliveredRow.assignment_id,
          presented_at: "2026-09-20T00:00:00.000Z",
        },
      ],
      error: null,
    });
    supabase.getClient.mockReturnValue({ rpc });

    await expect(
      confirmPresentation(deliveredRow.assignment_id),
    ).resolves.toEqual({
      kind: "CONFIRMED",
      assignmentId: deliveredRow.assignment_id,
      presentedAt: "2026-09-20T00:00:00.000Z",
    });
    expect(rpc).toHaveBeenCalledWith("confirm_question_presentation", {
      p_assignment_id: deliveredRow.assignment_id,
    });
  });

  it("maps RECORDED to AnsweredQuestionResult including nullable key/explanation", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          outcome: "RECORDED",
          assignment_id: deliveredRow.assignment_id,
          attempt_id: "33333333-3333-3333-3333-333333333333",
          selected_answer: "A",
          is_correct: false,
          correct_answer: null,
          explanation: null,
        },
      ],
      error: null,
    });
    supabase.getClient.mockReturnValue({ rpc });

    await expect(
      submitResponse(deliveredRow.assignment_id, "A", "44444444-4444-4444-4444-444444444444"),
    ).resolves.toEqual({
      kind: "RECORDED",
      result: {
        assignmentId: deliveredRow.assignment_id,
        attemptId: "33333333-3333-3333-3333-333333333333",
        selectedAnswer: "A",
        isCorrect: false,
        correctAnswer: null,
        explanation: null,
      },
    });

    expect(rpc).toHaveBeenCalledWith("submit_question_response", {
      p_assignment_id: deliveredRow.assignment_id,
      p_selected_answer: "A",
      p_submission_id: "44444444-4444-4444-4444-444444444444",
    });
    expect(rpc.mock.calls[0][1]).not.toHaveProperty("p_correct");
  });
});
