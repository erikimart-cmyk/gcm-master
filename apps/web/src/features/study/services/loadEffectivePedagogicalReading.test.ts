import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({
  readEffectiveLearningEvidence: vi.fn(),
}));

vi.mock("@/features/study/repositories/EffectiveEvidenceRepository", () => ({
  readEffectiveLearningEvidence: repository.readEffectiveLearningEvidence,
}));

import loaderSource from "./loadEffectivePedagogicalReading.ts?raw";
import { loadEffectivePedagogicalReading } from "./loadEffectivePedagogicalReading";
import type { EffectiveEvidenceReading } from "@/features/study/types/EffectiveEvidence";

const reading: EffectiveEvidenceReading = {
  resolverVersion: "effective-evidence-v1",
  actionsApplied: true,
  integrityStatus: "ok",
  unresolvedEvidenceIds: [],
  components: [],
  evidence: [
    {
      evidenceId: "evidence-1002",
      learningEventId: "event-1002",
      questionId: 1002,
      questionVersionId: "version-1002",
      attemptId: "attempt-1002",
      knowledgeUnitId: "percentage-increase-decrease",
      knowledgeUnitName: "Aumento e desconto percentual",
      stage: "comprehension",
      observation: "difficulty",
      observedAt: "2026-10-02T11:00:00+00:00",
      generatedAt: "2026-10-02T11:00:01+00:00",
      strength: "weak",
      assistanceContext: "unknown",
      timingInterpretation: "unknown",
      producerType: "deterministic_rule",
      producerVersion: "m2c-v1",
    },
    {
      evidenceId: "evidence-1003",
      learningEventId: "event-1003",
      questionId: 1003,
      questionVersionId: "version-1003",
      attemptId: "attempt-1003",
      knowledgeUnitId: "percentage-increase-decrease",
      knowledgeUnitName: "Aumento e desconto percentual",
      stage: "comprehension",
      observation: "success",
      observedAt: "2026-10-02T12:00:00+00:00",
      generatedAt: "2026-10-02T12:00:01+00:00",
      strength: "weak",
      assistanceContext: "unknown",
      timingInterpretation: "unknown",
      producerType: "deterministic_rule",
      producerVersion: "m2c-v1",
    },
  ],
};

describe("loadEffectivePedagogicalReading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("composes the repository reading without choosing a question", async () => {
    repository.readEffectiveLearningEvidence.mockResolvedValue(reading);

    const loaded = await loadEffectivePedagogicalReading();

    expect(repository.readEffectiveLearningEvidence).toHaveBeenCalledTimes(1);
    expect(repository.readEffectiveLearningEvidence).toHaveBeenCalledWith();
    expect(loaded.resolverVersion).toBe("effective-evidence-v1");
    expect(loaded.actionsApplied).toBe(true);
    expect(loaded.interpretations[0]).toMatchObject({
      direction: "mixed",
      support: "opposed",
      evidenceActionsApplied: false,
    });
    expect(loaded.provenance.map((item) => item.questionId)).toEqual([1002, 1003]);
    expect(loaderSource).not.toMatch(
      /request_question_delivery|assign_next_questions|recommendation|evidence_actions/i,
    );
  });
});
