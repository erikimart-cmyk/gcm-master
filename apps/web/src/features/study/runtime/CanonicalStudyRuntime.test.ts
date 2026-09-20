import { describe, expect, it, vi } from "vitest";

import { CanonicalStudyTransportError } from "@/features/study/repositories/CanonicalStudyRepository";
import type { CanonicalStudyClient } from "@/features/study/repositories/CanonicalStudyRepository";
import { CanonicalStudyRuntime } from "@/features/study/runtime/CanonicalStudyRuntime";
import { pendingStudySubmissionKey } from "@/features/study/services/pendingStudySubmission";
import type {
  DeliveredQuestion,
  PresentationOutcome,
  ResponseOutcome,
} from "@/features/study/types/CanonicalStudy";

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

const question: DeliveredQuestion = {
  assignmentId: "asg-1",
  questionVersionId: "qv-1",
  questionId: 42,
  statement: "Enunciado seguro",
  alternatives: [
    { id: "A", text: "A" },
    { id: "B", text: "B" },
  ],
  difficulty: "easy",
  subjectLabel: "Constitucional",
  topicLabel: "Princípios",
  presentationContext: "study",
};

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    data,
  };
}

function createRuntime(overrides: {
  userId?: string;
  client?: Partial<CanonicalStudyClient>;
  storage?: ReturnType<typeof memoryStorage>;
  createSubmissionId?: () => string;
  onRecorded?: (input: {
    question: DeliveredQuestion;
    result: {
      assignmentId: string;
      attemptId: string;
      selectedAnswer: string;
      isCorrect: boolean;
    };
  }) => void;
} = {}) {
  const storage = overrides.storage ?? memoryStorage();
  const client: CanonicalStudyClient = {
    requestStudyQuestion: vi.fn(async () => ({
      kind: "DELIVERED" as const,
      question,
    })),
    confirmPresentation: vi.fn(async () => ({
      kind: "CONFIRMED" as const,
      assignmentId: question.assignmentId,
      presentedAt: "2026-09-20T00:00:00.000Z",
    })),
    submitResponse: vi.fn(async () => ({
      kind: "RECORDED" as const,
      result: {
        assignmentId: question.assignmentId,
        attemptId: "att-1",
        selectedAnswer: "B",
        isCorrect: true,
        correctAnswer: "B",
        explanation: "Porque B.",
      },
    })),
    ...overrides.client,
  };

  const runtime = new CanonicalStudyRuntime({
    userId: overrides.userId ?? "user-1",
    client,
    storage,
    createSubmissionId:
      overrides.createSubmissionId ??
      (() => "sub-fixed"),
    onRecorded: overrides.onRecorded ?? (() => undefined),
  });

  return { runtime, client, storage };
}

async function deliverAndConfirm(runtime: CanonicalStudyRuntime) {
  await runtime.start();
  const assignmentId = runtime.snapshot().question?.assignmentId;
  expect(assignmentId).toBe(question.assignmentId);
  await runtime.notifyRendered(assignmentId!);
  expect(runtime.snapshot().phase).toBe("READY");
}

describe("CanonicalStudyRuntime", () => {
  it("does not confirm until the delivered question is committed to render", async () => {
    const { runtime, client } = createRuntime();
    await runtime.start();

    expect(runtime.snapshot().phase).toBe("RENDERED_CONFIRMING");
    expect(client.confirmPresentation).not.toHaveBeenCalled();
    expect(runtime.snapshot().alternativesEnabled).toBe(false);

    await runtime.notifyRendered(question.assignmentId);
    expect(client.confirmPresentation).toHaveBeenCalledTimes(1);
    expect(client.confirmPresentation).toHaveBeenCalledWith(question.assignmentId);
    expect(runtime.snapshot().phase).toBe("READY");
    expect(runtime.snapshot().alternativesEnabled).toBe(true);
  });

  it("ignores confirmation for a stale assignment", async () => {
    const { runtime, client } = createRuntime();
    await runtime.start();
    await runtime.notifyRendered("stale-assignment");
    expect(client.confirmPresentation).not.toHaveBeenCalled();
    expect(runtime.snapshot().phase).toBe("RENDERED_CONFIRMING");
  });

  it("protects confirmation against StrictMode double invocation", async () => {
    let release: (value: {
      kind: "CONFIRMED";
      assignmentId: string;
      presentedAt: string;
    }) => void = () => undefined;
    const { runtime, client } = createRuntime({
      client: {
        confirmPresentation: vi.fn(
          () =>
            new Promise<PresentationOutcome>((resolve) => {
              release = resolve;
            }),
        ),
      },
    });
    await runtime.start();
    const first = runtime.notifyRendered(question.assignmentId);
    const second = runtime.notifyRendered(question.assignmentId);
    release({
      kind: "CONFIRMED",
      assignmentId: question.assignmentId,
      presentedAt: "2026-09-20T00:00:00.000Z",
    });
    await Promise.all([first, second]);
    expect(client.confirmPresentation).toHaveBeenCalledTimes(1);
  });

  it("retries delivery transport without falling back to assign_next_questions", async () => {
    const requestStudyQuestion = vi
      .fn()
      .mockRejectedValueOnce(new CanonicalStudyTransportError("net"))
      .mockResolvedValueOnce({ kind: "DELIVERED", question });
    const { runtime, client } = createRuntime({
      client: { requestStudyQuestion },
    });

    await runtime.start();
    expect(runtime.snapshot().phase).toBe("ERROR_RETRYABLE");
    await runtime.retry();
    expect(runtime.snapshot().phase).toBe("RENDERED_CONFIRMING");
    expect(requestStudyQuestion).toHaveBeenCalledTimes(2);
    expect(client).not.toHaveProperty("assignNextQuestions");
  });

  it("retries confirmation for the same assignment", async () => {
    const confirmPresentation = vi
      .fn()
      .mockRejectedValueOnce(new CanonicalStudyTransportError("net"))
      .mockResolvedValueOnce({
        kind: "CONFIRMED",
        assignmentId: question.assignmentId,
        presentedAt: "2026-09-20T00:00:00.000Z",
      });
    const { runtime } = createRuntime({ client: { confirmPresentation } });
    await runtime.start();
    await runtime.notifyRendered(question.assignmentId);
    expect(runtime.snapshot().phase).toBe("ERROR_RETRYABLE");
    await runtime.retry();
    expect(confirmPresentation).toHaveBeenNthCalledWith(1, question.assignmentId);
    expect(confirmPresentation).toHaveBeenNthCalledWith(2, question.assignmentId);
    expect(runtime.snapshot().phase).toBe("READY");
  });

  it("persists pending submission before the RPC and reuses submissionId on transport retry", async () => {
    const created: string[] = [];
    const submitResponse = vi
      .fn()
      .mockRejectedValueOnce(new CanonicalStudyTransportError("net"))
      .mockResolvedValueOnce({
        kind: "RECORDED",
        result: {
          assignmentId: question.assignmentId,
          attemptId: "att-1",
          selectedAnswer: "B",
          isCorrect: true,
          correctAnswer: "B",
          explanation: null,
        },
      });
    const { runtime, storage } = createRuntime({
      client: { submitResponse },
      createSubmissionId: () => {
        const id = `sub-${created.length + 1}`;
        created.push(id);
        return id;
      },
    });
    await deliverAndConfirm(runtime);

    runtime.submit("B");
    expect(storage.getItem(pendingStudySubmissionKey("user-1", "asg-1"))).toBe(
      JSON.stringify({ submissionId: "sub-1", selectedAnswer: "B" }),
    );
    await flush();
    expect(submitResponse).toHaveBeenCalledTimes(1);
    expect(runtime.snapshot().phase).toBe("ERROR_RETRYABLE");
    expect(runtime.snapshot().selectedAnswer).toBe("B");

    runtime.retry();
    await flush();

    expect(created).toEqual(["sub-1"]);
    expect(submitResponse).toHaveBeenNthCalledWith(1, "asg-1", "B", "sub-1");
    expect(submitResponse).toHaveBeenNthCalledWith(2, "asg-1", "B", "sub-1");
    expect(runtime.snapshot().phase).toBe("ANSWERED");
    expect(runtime.snapshot().result?.isCorrect).toBe(true);
    expect(storage.getItem(pendingStudySubmissionKey("user-1", "asg-1"))).toBeNull();
  });

  it("restores the exact pending submission after refresh/recovery", async () => {
    const storage = memoryStorage();
    storage.setItem(
      pendingStudySubmissionKey("user-1", "asg-1"),
      JSON.stringify({ submissionId: "recovered-sub", selectedAnswer: "A" }),
    );
    const submitResponse = vi.fn(async (assignmentId, selectedAnswer) => ({
      kind: "RECORDED" as const,
      result: {
        assignmentId,
        attemptId: "att-9",
        selectedAnswer,
        isCorrect: false,
        correctAnswer: null,
        explanation: null,
      },
    }));
    const { runtime } = createRuntime({
      storage,
      client: { submitResponse },
      createSubmissionId: () => "should-not-mint",
    });

    await runtime.start();
    await runtime.notifyRendered(question.assignmentId);
    await flush();

    expect(submitResponse).toHaveBeenCalledWith("asg-1", "A", "recovered-sub");
    expect(runtime.snapshot().phase).toBe("ANSWERED");
    expect(runtime.snapshot().selectedAnswer).toBe("A");
    expect(runtime.snapshot().result?.correctAnswer).toBeNull();
    expect(storage.getItem(pendingStudySubmissionKey("user-1", "asg-1"))).toBeNull();
  });

  it("ignores a second fast click using a synchronous lock", async () => {
    let release: () => void = () => undefined;
    const submitResponse = vi.fn(
      () =>
        new Promise<ResponseOutcome>((resolve) => {
          release = () =>
            resolve({
              kind: "RECORDED",
              result: {
                assignmentId: question.assignmentId,
                attemptId: "att-1",
                selectedAnswer: "A",
                isCorrect: true,
                correctAnswer: "A",
                explanation: "ok",
              },
            });
        }),
    );
    const { runtime } = createRuntime({ client: { submitResponse } });
    await deliverAndConfirm(runtime);
    runtime.submit("A");
    runtime.submit("B");
    expect(submitResponse).toHaveBeenCalledTimes(1);
    expect(submitResponse).toHaveBeenCalledWith("asg-1", "A", "sub-fixed");
    release();
    await flush();
    expect(runtime.snapshot().result?.selectedAnswer).toBe("A");
  });

  it("uses server isCorrect and does not grade locally", async () => {
    const onRecorded = vi.fn();
    const { runtime } = createRuntime({
      client: {
        submitResponse: vi.fn(async () => ({
          kind: "RECORDED" as const,
          result: {
            assignmentId: question.assignmentId,
            attemptId: "att-1",
            selectedAnswer: "A",
            isCorrect: true,
            correctAnswer: "A",
            explanation: "server",
          },
        })),
      },
      onRecorded,
    });
    await deliverAndConfirm(runtime);
    runtime.submit("A");
    await flush();
    expect(runtime.snapshot().result?.isCorrect).toBe(true);
    expect(onRecorded).toHaveBeenCalledWith({
      question,
      result: expect.objectContaining({ isCorrect: true, explanation: "server" }),
    });
    expect(runtime.snapshot().correctAnswers).toBe(1);
  });

  it("keeps pending on CONFLICT and does not invent a local grade", async () => {
    const storage = memoryStorage();
    const { runtime } = createRuntime({
      storage,
      client: {
        submitResponse: vi.fn(async () => ({ kind: "CONFLICT" as const })),
      },
    });
    await deliverAndConfirm(runtime);
    runtime.submit("B");
    await flush();
    expect(runtime.snapshot().phase).toBe("CONFLICT");
    expect(runtime.snapshot().result).toBeNull();
    expect(storage.getItem(pendingStudySubmissionKey("user-1", "asg-1"))).toEqual(
      JSON.stringify({ submissionId: "sub-fixed", selectedAnswer: "B" }),
    );
  });

  it("treats delivery UNAVAILABLE as a safe empty state without static fallback", async () => {
    const { runtime } = createRuntime({
      client: {
        requestStudyQuestion: vi.fn(async () => ({ kind: "UNAVAILABLE" as const })),
      },
    });
    await runtime.start();
    expect(runtime.snapshot().phase).toBe("UNAVAILABLE");
    expect(runtime.snapshot().question).toBeNull();
  });

  it("treats DENIED as an auth-safe terminal outcome", async () => {
    const { runtime } = createRuntime({
      client: {
        requestStudyQuestion: vi.fn(async () => ({ kind: "DENIED" as const })),
      },
    });
    await runtime.start();
    expect(runtime.snapshot().phase).toBe("DENIED");
  });

  it("caps the session at 5 RECORDED answers and treats a recovered assignment as the current item", async () => {
    let deliveries = 0;
    const { runtime } = createRuntime({
      client: {
        requestStudyQuestion: vi.fn(async () => {
          deliveries += 1;
          return {
            kind: "DELIVERED" as const,
            question: {
              ...question,
              assignmentId: `asg-${deliveries}`,
              questionId: deliveries,
            },
          };
        }),
        confirmPresentation: vi.fn(async (assignmentId: string) => ({
          kind: "CONFIRMED" as const,
          assignmentId,
          presentedAt: "2026-09-20T00:00:00.000Z",
        })),
        submitResponse: vi.fn(async (assignmentId: string, selectedAnswer: string) => ({
          kind: "RECORDED" as const,
          result: {
            assignmentId,
            attemptId: `att-${assignmentId}`,
            selectedAnswer,
            isCorrect: false,
            correctAnswer: "B",
            explanation: null,
          },
        })),
      },
    });

    await runtime.start();
    expect(runtime.snapshot().question?.assignmentId).toBe("asg-1");
    await runtime.notifyRendered("asg-1");
    runtime.submit("A");
    await flush();

    for (let index = 0; index < 4; index += 1) {
      runtime.next();
      await flush();
      const assignmentId = runtime.snapshot().question?.assignmentId;
      expect(assignmentId).toBeDefined();
      await runtime.notifyRendered(assignmentId!);
      runtime.submit("A");
      await flush();
    }

    expect(runtime.snapshot().recordedCount).toBe(5);
    expect(runtime.snapshot().phase).toBe("ANSWERED");
    runtime.next();
    expect(runtime.snapshot().phase).toBe("SESSION_DONE");
    expect(deliveries).toBe(5);
  });

  it("does not request delivery while submitting", async () => {
    const requestStudyQuestion = vi.fn(async () => ({
      kind: "DELIVERED" as const,
      question,
    }));
    let release: () => void = () => undefined;
    const submitResponse = vi.fn(
      () =>
        new Promise<ResponseOutcome>((resolve) => {
          release = () =>
            resolve({
              kind: "RECORDED",
              result: {
                assignmentId: question.assignmentId,
                attemptId: "att-1",
                selectedAnswer: "A",
                isCorrect: true,
                correctAnswer: "A",
                explanation: null,
              },
            });
        }),
    );
    const { runtime } = createRuntime({
      client: { requestStudyQuestion, submitResponse },
    });
    await deliverAndConfirm(runtime);
    runtime.submit("A");
    expect(runtime.snapshot().phase).toBe("SUBMITTING");
    await runtime.start();
    runtime.next();
    expect(requestStudyQuestion).toHaveBeenCalledTimes(1);
    release();
  });

  it("scopes pending submission to the authenticated user id", async () => {
    const storage = memoryStorage();
    const submitResponse = vi.fn(async () => {
      expect(storage.getItem(pendingStudySubmissionKey("auth-user-9", "asg-1"))).toBe(
        JSON.stringify({ submissionId: "sub-fixed", selectedAnswer: "B" }),
      );
      return {
        kind: "RECORDED" as const,
        result: {
          assignmentId: question.assignmentId,
          attemptId: "att-1",
          selectedAnswer: "B",
          isCorrect: true,
          correctAnswer: "B",
          explanation: null,
        },
      };
    });
    const { runtime, client } = createRuntime({
      userId: "auth-user-9",
      storage,
      client: { submitResponse },
    });
    await deliverAndConfirm(runtime);
    runtime.submit("B");
    await flush();

    expect(client.submitResponse).toHaveBeenCalledWith("asg-1", "B", "sub-fixed");
    expect(
      [...storage.data.keys()].some((key) => key.includes("anonymous")),
    ).toBe(false);
  });

  it("does not create an anonymous pending key or submit without an authenticated user id", async () => {
    const storage = memoryStorage();
    const { runtime, client } = createRuntime({
      userId: "",
      storage,
    });
    await runtime.start();
    runtime.submit("A");
    await flush();

    expect(runtime.snapshot().phase).toBe("DENIED");
    expect(client.requestStudyQuestion).not.toHaveBeenCalled();
    expect(client.submitResponse).not.toHaveBeenCalled();
    expect(storage.getItem("zynvo:m2c:sub:anonymous:asg-1")).toBeNull();
    expect([...storage.data.keys()]).toEqual([]);
  });

  it("rejects the anonymous fallback identity before any pending read or submit", async () => {
    const storage = memoryStorage();
    storage.setItem(
      "zynvo:m2c:sub:anonymous:asg-1",
      JSON.stringify({ submissionId: "leaked-sub", selectedAnswer: "A" }),
    );
    const { runtime, client } = createRuntime({
      userId: "anonymous",
      storage,
    });
    await runtime.start();
    runtime.submit("A");
    await flush();

    expect(runtime.snapshot().phase).toBe("DENIED");
    expect(client.submitResponse).not.toHaveBeenCalled();
    expect(storage.getItem("zynvo:m2c:sub:anonymous:asg-1")).toBe(
      JSON.stringify({ submissionId: "leaked-sub", selectedAnswer: "A" }),
    );
  });

  it("does not restore another user's pending submission through the current user key", async () => {
    const storage = memoryStorage();
    storage.setItem(
      pendingStudySubmissionKey("user-1", "asg-1"),
      JSON.stringify({ submissionId: "user-1-sub", selectedAnswer: "A" }),
    );
    const submitResponse = vi.fn(async () => ({
      kind: "RECORDED" as const,
      result: {
        assignmentId: question.assignmentId,
        attemptId: "att-other",
        selectedAnswer: "B",
        isCorrect: true,
        correctAnswer: "B",
        explanation: null,
      },
    }));
    const { runtime } = createRuntime({
      userId: "user-2",
      storage,
      client: { submitResponse },
      createSubmissionId: () => "user-2-sub",
    });

    await deliverAndConfirm(runtime);
    await flush();
    expect(submitResponse).not.toHaveBeenCalled();
    expect(runtime.snapshot().phase).toBe("READY");

    runtime.submit("B");
    await flush();
    expect(submitResponse).toHaveBeenCalledWith("asg-1", "B", "user-2-sub");
    expect(storage.getItem(pendingStudySubmissionKey("user-1", "asg-1"))).toEqual(
      JSON.stringify({ submissionId: "user-1-sub", selectedAnswer: "A" }),
    );
  });
});

