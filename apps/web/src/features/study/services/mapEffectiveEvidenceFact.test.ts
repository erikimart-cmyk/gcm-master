import { describe, expect, it } from "vitest";

import { mapEffectiveEvidenceRecord } from "./mapEffectiveEvidenceFact";
import type { EffectiveEvidenceRecord } from "@/features/study/types/EffectiveEvidence";

const record: EffectiveEvidenceRecord = {
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
};

describe("mapEffectiveEvidenceRecord", () => {
  it("copies a LearningEvidenceFact and keeps question provenance beside it", () => {
    const mapped = mapEffectiveEvidenceRecord(record);

    expect(mapped.fact).toEqual({
      evidenceId: "evidence-1002",
      knowledgeUnitId: "percentage-increase-decrease",
      knowledgeUnitName: "Aumento e desconto percentual",
      observation: "difficulty",
      stage: "comprehension",
      strength: "weak",
      assistanceContext: "unknown",
      timingInterpretation: "unknown",
      producerType: "deterministic_rule",
      producerVersion: "m2c-v1",
      observedAt: "2026-10-02T11:00:00+00:00",
      generatedAt: "2026-10-02T11:00:01+00:00",
    });
    expect(mapped.fact).not.toHaveProperty("questionId");
    expect(mapped.fact).not.toHaveProperty("questionVersionId");
    expect(mapped.fact).not.toHaveProperty("attemptId");
    expect(mapped.provenance).toEqual({
      evidenceId: "evidence-1002",
      learningEventId: "event-1002",
      questionId: 1002,
      questionVersionId: "version-1002",
      attemptId: "attempt-1002",
    });
  });
});
