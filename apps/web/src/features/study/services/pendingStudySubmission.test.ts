import { describe, expect, it } from "vitest";

import {
  clearPendingStudySubmission,
  isCanonicalPendingUserId,
  pendingStudySubmissionKey,
  persistPendingStudySubmission,
  readPendingStudySubmission,
  shouldClearPendingOnResponse,
} from "./pendingStudySubmission";

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

describe("pendingStudySubmission", () => {
  it("uses the required sessionStorage key shape", () => {
    expect(pendingStudySubmissionKey("user-1", "asg-1")).toBe(
      "zynvo:m2c:sub:user-1:asg-1",
    );
  });

  it("persists only submissionId and selectedAnswer", () => {
    const storage = memoryStorage();
    persistPendingStudySubmission(storage, "user-1", "asg-1", {
      submissionId: "sub-1",
      selectedAnswer: "B",
    });

    expect(JSON.parse(storage.data.get("zynvo:m2c:sub:user-1:asg-1") ?? "")).toEqual({
      submissionId: "sub-1",
      selectedAnswer: "B",
    });
    expect(readPendingStudySubmission(storage, "user-1", "asg-1")).toEqual({
      submissionId: "sub-1",
      selectedAnswer: "B",
    });
  });

  it("clears pending only after RECORDED", () => {
    expect(shouldClearPendingOnResponse("RECORDED")).toBe(true);
    expect(shouldClearPendingOnResponse("CONFLICT")).toBe(false);
    expect(shouldClearPendingOnResponse("UNAVAILABLE")).toBe(false);
    expect(shouldClearPendingOnResponse("DENIED")).toBe(false);

    const storage = memoryStorage();
    persistPendingStudySubmission(storage, "user-1", "asg-1", {
      submissionId: "sub-1",
      selectedAnswer: "B",
    });
    clearPendingStudySubmission(storage, "user-1", "asg-1");
    expect(readPendingStudySubmission(storage, "user-1", "asg-1")).toBeNull();
  });

  it("never reads or writes an anonymous or empty pending key", () => {
    const storage = memoryStorage();
    persistPendingStudySubmission(storage, "anonymous", "asg-1", {
      submissionId: "sub-1",
      selectedAnswer: "A",
    });
    persistPendingStudySubmission(storage, "", "asg-1", {
      submissionId: "sub-2",
      selectedAnswer: "B",
    });

    expect(isCanonicalPendingUserId("user-1")).toBe(true);
    expect(isCanonicalPendingUserId("anonymous")).toBe(false);
    expect(isCanonicalPendingUserId("")).toBe(false);
    expect(storage.data.has("zynvo:m2c:sub:anonymous:asg-1")).toBe(false);
    expect(readPendingStudySubmission(storage, "anonymous", "asg-1")).toBeNull();
    expect([...storage.data.keys()]).toEqual([]);
  });

  it("does not restore one user's pending entry through another user's key", () => {
    const storage = memoryStorage();
    persistPendingStudySubmission(storage, "user-1", "asg-1", {
      submissionId: "sub-user-1",
      selectedAnswer: "A",
    });

    expect(readPendingStudySubmission(storage, "user-2", "asg-1")).toBeNull();
    expect(readPendingStudySubmission(storage, "user-1", "asg-1")).toEqual({
      submissionId: "sub-user-1",
      selectedAnswer: "A",
    });
  });
});

