import type { PendingStudySubmission } from "@/features/study/types/CanonicalStudy";
import { PENDING_SUBMISSION_STORAGE_PREFIX } from "@/features/study/types/CanonicalStudy";

export type PendingSubmissionStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export function isCanonicalPendingUserId(userId: string): boolean {
  const trimmed = userId.trim();
  return trimmed.length > 0 && trimmed.toLowerCase() !== "anonymous";
}

export function pendingStudySubmissionKey(
  userId: string,
  assignmentId: string,
): string {
  return `${PENDING_SUBMISSION_STORAGE_PREFIX}${userId}:${assignmentId}`;
}

export function readPendingStudySubmission(
  storage: PendingSubmissionStorage,
  userId: string,
  assignmentId: string,
): PendingStudySubmission | null {
  if (!isCanonicalPendingUserId(userId)) {
    return null;
  }

  const raw = storage.getItem(pendingStudySubmissionKey(userId, assignmentId));

  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    const submissionId = record.submissionId;
    const selectedAnswer = record.selectedAnswer;

    if (typeof submissionId !== "string" || submissionId.length === 0) {
      return null;
    }

    if (typeof selectedAnswer !== "string" || selectedAnswer.length === 0) {
      return null;
    }

    return { submissionId, selectedAnswer };
  } catch {
    return null;
  }
}

export function persistPendingStudySubmission(
  storage: PendingSubmissionStorage,
  userId: string,
  assignmentId: string,
  pending: PendingStudySubmission,
): void {
  if (!isCanonicalPendingUserId(userId)) {
    return;
  }

  storage.setItem(
    pendingStudySubmissionKey(userId, assignmentId),
    JSON.stringify({
      submissionId: pending.submissionId,
      selectedAnswer: pending.selectedAnswer,
    }),
  );
}

export function clearPendingStudySubmission(
  storage: PendingSubmissionStorage,
  userId: string,
  assignmentId: string,
): void {
  if (!isCanonicalPendingUserId(userId)) {
    return;
  }

  storage.removeItem(pendingStudySubmissionKey(userId, assignmentId));
}

export function shouldClearPendingOnResponse(
  outcome: Response["kind"] | "RECORDED" | "CONFLICT" | "UNAVAILABLE" | "DENIED",
): boolean {
  // RECORDED is the only outcome that proves this logical submission is
  // reconciled. CONFLICT / UNAVAILABLE / DENIED may still represent a
  // committed or uncertain server write, so the pending entry is kept.
  return outcome === "RECORDED";
}

type Response = {
  kind: "RECORDED" | "CONFLICT" | "UNAVAILABLE" | "DENIED";
};

export function browserPendingSubmissionStorage(): PendingSubmissionStorage {
  return sessionStorage;
}
