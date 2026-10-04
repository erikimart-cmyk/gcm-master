import { beforeEach, describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({
  getClient: vi.fn(),
}));

vi.mock("@/features/auth/lib/supabase", () => ({
  getSupabaseClient: supabase.getClient,
}));

import dashboardSource from "@/features/dashboard/pages/DashboardPage.tsx?raw";
import { getDashboardState } from "@/features/dashboard/services/getDashboardState";
import contextSource from "@/features/landing/context/StudyProgressContext.tsx?raw";
import reviewSource from "@/features/landing/pages/Review/ReviewPage.tsx?raw";
import { calculateSubjectPerformance } from "@/features/study/services/SubjectPerformanceCalculator";
import calculatorSource from "@/features/study/services/SubjectPerformanceCalculator.ts?raw";
import { hydrateQuestionResults } from "@/features/study/services/hydrateQuestionResults";
import { prioritizeSubjects } from "@/features/study/services/SubjectPriorityEngine";
import prioritySource from "@/features/study/services/SubjectPriorityEngine.ts?raw";

import repositorySource from "./StudyProgressRepository.ts?raw";
import { loadQuestionAttempts } from "./StudyProgressRepository";

const subject = "Matemática e Raciocínio Lógico";

type StoredAttempt = {
  user_id: string;
  question_id: number;
  subject: string;
  topic: string | null;
  correct: boolean;
  answered_at: string;
  created_at: string;
  attempt_number: number;
  is_review: boolean;
  learning_event_id: string | null;
};

type QueryCall = {
  method: string;
  args: unknown[];
};

function attempt(
  input: Pick<StoredAttempt, "question_id" | "subject" | "correct" | "learning_event_id"> &
    Partial<StoredAttempt>,
): StoredAttempt {
  return {
    user_id: "smoke-user",
    topic: "Porcentagem e proporcionalidade",
    answered_at: "2026-10-02T07:06:55.853184+00:00",
    created_at: "2026-10-02T07:06:55.853184+00:00",
    attempt_number: 1,
    is_review: false,
    ...input,
  };
}

function installAttempts(rows: StoredAttempt[]) {
  const calls: QueryCall[] = [];

  const builder = {
    select(columns: string) {
      calls.push({ method: "select", args: [columns] });
      return builder;
    },
    eq(column: string, value: string) {
      calls.push({ method: "eq", args: [column, value] });
      return builder;
    },
    not(column: string, operator: string, value: unknown) {
      calls.push({ method: "not", args: [column, operator, value] });
      return builder;
    },
    order(column: string, options: { ascending: boolean }) {
      calls.push({ method: "order", args: [column, options] });
      return builder;
    },
    then(
      onFulfilled: (value: { data: unknown[]; error: null }) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      const userId = calls.find((call) => call.method === "eq" && call.args[0] === "user_id")
        ?.args[1];
      const canonicalOnly = calls.some(
        (call) =>
          call.method === "not" &&
          call.args[0] === "learning_event_id" &&
          call.args[1] === "is" &&
          call.args[2] === null,
      );

      const visible = rows
        .filter((row) => row.user_id === userId)
        .filter((row) => !canonicalOnly || row.learning_event_id !== null)
        .sort((left, right) => {
          const byAnswer = left.answered_at.localeCompare(right.answered_at);
          return byAnswer === 0 ? left.created_at.localeCompare(right.created_at) : byAnswer;
        })
        .map((row) => ({
          question_id: row.question_id,
          subject: row.subject,
          topic: row.topic,
          correct: row.correct,
          answered_at: row.answered_at,
          attempt_number: row.attempt_number,
          is_review: row.is_review,
        }));

      return Promise.resolve({ data: visible, error: null }).then(onFulfilled, onRejected);
    },
  };

  supabase.getClient.mockReturnValue({
    from: (table: string) => {
      calls.push({ method: "from", args: [table] });
      return builder;
    },
  });

  return calls;
}

function sharedMetrics() {
  return loadQuestionAttempts("smoke-user").then((loaded) => {
    const questionResults = hydrateQuestionResults(loaded);
    const correctAnswers = questionResults.filter((result) => result.correct).length;
    const progress = {
      questionsAnswered: questionResults.length,
      correctAnswers,
      wrongAnswers: questionResults.length - correctAnswers,
    };
    const performance = calculateSubjectPerformance(questionResults);
    const priorities = prioritizeSubjects(performance);

    return {
      loaded,
      progress,
      performance,
      priorities,
      dashboard: getDashboardState(progress, priorities.length > 0),
    };
  });
}

const smokeAttempts = [
  attempt({
    question_id: 1001,
    subject,
    correct: true,
    learning_event_id: "event-1001",
    answered_at: "2026-10-02T07:06:55.853184+00:00",
    created_at: "2026-10-02T07:06:55.853184+00:00",
  }),
  attempt({
    question_id: 1002,
    subject,
    correct: false,
    learning_event_id: "event-1002",
    answered_at: "2026-10-02T07:23:59.720173+00:00",
    created_at: "2026-10-02T07:23:59.720173+00:00",
  }),
  attempt({
    question_id: 1003,
    subject,
    correct: true,
    learning_event_id: "event-1003",
    answered_at: "2026-10-02T21:16:56.846988+00:00",
    created_at: "2026-10-02T21:16:56.846988+00:00",
  }),
  attempt({
    question_id: 1004,
    subject,
    correct: true,
    learning_event_id: "event-1004",
    answered_at: "2026-10-02T21:59:32.432621+00:00",
    created_at: "2026-10-02T21:59:32.432621+00:00",
  }),
  attempt({
    question_id: 1005,
    subject,
    correct: false,
    learning_event_id: "event-1005",
    answered_at: "2026-10-02T23:03:09.839649+00:00",
    created_at: "2026-10-02T23:03:09.839649+00:00",
  }),
];

describe("loadQuestionAttempts canonical filter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("excludes a legacy attempt whose learning_event_id is null", async () => {
    installAttempts([
      attempt({
        question_id: 1001,
        subject: "Direito Constitucional",
        correct: false,
        learning_event_id: null,
        is_review: false,
      }),
    ]);

    const metrics = await sharedMetrics();
    expect(metrics.loaded).toEqual([]);
    expect(metrics.progress).toEqual({
      questionsAnswered: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
    });
    expect(metrics.performance).toEqual([]);
    expect(metrics.priorities).toEqual([]);
    expect(metrics.dashboard.accuracy).toBeNull();
  });

  it("includes a canonical attempt whose learning_event_id is present", async () => {
    installAttempts([
      attempt({
        question_id: 1004,
        subject,
        correct: true,
        learning_event_id: "event-1004",
        is_review: false,
      }),
    ]);

    const metrics = await sharedMetrics();
    expect(metrics.loaded).toEqual([
      {
        questionId: 1004,
        subject,
        topic: "Porcentagem e proporcionalidade",
        correct: true,
        answeredAt: "2026-10-02T07:06:55.853184+00:00",
        attempt: 1,
        isReview: false,
      },
    ]);
    expect(metrics.progress).toEqual({
      questionsAnswered: 1,
      correctAnswers: 1,
      wrongAnswers: 0,
    });
  });

  it("keeps the smoke cycle at 5 answered, 3 correct, 2 wrong and 60%", async () => {
    const calls = installAttempts(smokeAttempts);
    const metrics = await sharedMetrics();

    expect(calls).toEqual(
      expect.arrayContaining([
        {
          method: "select",
          args: ["question_id, subject, topic, correct, answered_at, attempt_number, is_review"],
        },
        { method: "not", args: ["learning_event_id", "is", null] },
      ]),
    );
    expect(metrics.progress).toEqual({
      questionsAnswered: 5,
      correctAnswers: 3,
      wrongAnswers: 2,
    });
    expect(metrics.performance).toEqual([
      {
        subject,
        questionsAnswered: 5,
        correctAnswers: 3,
        wrongAnswers: 2,
        accuracy: 60,
        priority: "medium",
      },
    ]);
    expect(metrics.priorities[0]).toMatchObject({
      subject,
      accuracy: 60,
      wrongAnswers: 2,
    });
    expect(metrics.dashboard.accuracy).toBe(60);
  });

  it("lets only canonical attempts affect score and subject priority", async () => {
    installAttempts([
      ...smokeAttempts,
      attempt({
        question_id: 1002,
        subject,
        correct: false,
        learning_event_id: null,
        is_review: false,
        answered_at: "2026-09-01T00:00:00.000Z",
        created_at: "2026-09-01T00:00:00.000Z",
        attempt_number: 1,
      }),
      attempt({
        question_id: 7,
        subject: "Direito Constitucional",
        correct: false,
        learning_event_id: null,
        is_review: true,
        answered_at: "2026-09-02T00:00:00.000Z",
        created_at: "2026-09-02T00:00:00.000Z",
      }),
    ]);

    const metrics = await sharedMetrics();
    expect(metrics.loaded.map((row) => row.questionId)).toEqual([1001, 1002, 1003, 1004, 1005]);
    expect(metrics.progress).toEqual({
      questionsAnswered: 5,
      correctAnswers: 3,
      wrongAnswers: 2,
    });
    expect(metrics.performance.map((item) => item.subject)).toEqual([subject]);
    expect(metrics.priorities.map((item) => item.subject)).toEqual([subject]);
    expect(metrics.priorities[0]?.accuracy).toBe(60);
    expect(metrics.dashboard.accuracy).toBe(60);
  });

  it("applies the canonical filter once, in the shared loader used by dashboard and review", () => {
    expect(repositorySource).toContain('.not("learning_event_id", "is", null)');
    expect(repositorySource).not.toContain("learning_event_id,");
    expect(contextSource).toContain("loadQuestionAttempts");
    expect(contextSource).not.toContain("learning_event_id");
    expect(dashboardSource).toContain("useStudyProgress");
    expect(reviewSource).toContain("useStudyProgress");
    expect(dashboardSource).not.toContain("learning_event_id");
    expect(reviewSource).not.toContain("learning_event_id");
    expect(dashboardSource).not.toContain("question_attempts");
    expect(reviewSource).not.toContain("question_attempts");
    expect(calculatorSource).not.toContain("learning_event_id");
    expect(prioritySource).not.toContain("learning_event_id");
  });
});
