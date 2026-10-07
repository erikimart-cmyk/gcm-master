import { describe, expect, it } from "vitest";

import composerSource from "./composeEffectivePedagogicalReading.ts?raw";
import { composeEffectivePedagogicalReading } from "./composeEffectivePedagogicalReading";
import { interpretKnowledgeUnitEvidence } from "./interpretKnowledgeUnitEvidence";
import { mapEffectiveEvidenceRecord } from "./mapEffectiveEvidenceFact";
import { projectKnowledgeUnitEvidence } from "./projectKnowledgeUnitEvidence";
import type {
  EffectiveEvidenceReading,
  EffectiveEvidenceRecord,
} from "@/features/study/types/EffectiveEvidence";

function record(
  evidenceId: string,
  questionId: number,
  observation: EffectiveEvidenceRecord["observation"],
): EffectiveEvidenceRecord {
  return {
    evidenceId,
    learningEventId: `event-${questionId}`,
    questionId,
    questionVersionId: `version-${questionId}`,
    attemptId: `attempt-${questionId}`,
    knowledgeUnitId: "percentage-increase-decrease",
    knowledgeUnitName: "Aumento e desconto percentual",
    stage: "comprehension",
    observation,
    observedAt: `2026-10-02T1${questionId % 10}:00:00+00:00`,
    generatedAt: `2026-10-02T1${questionId % 10}:00:01+00:00`,
    strength: "weak",
    assistanceContext: "unknown",
    timingInterpretation: "unknown",
    producerType: "deterministic_rule",
    producerVersion: "m2c-v1",
  };
}

function reading(
  evidence: readonly EffectiveEvidenceRecord[],
  integrity: EffectiveEvidenceReading["integrityStatus"] = "ok",
): EffectiveEvidenceReading {
  return {
    resolverVersion: "effective-evidence-v1",
    actionsApplied: true,
    integrityStatus: integrity,
    unresolvedEvidenceIds:
      integrity === "degraded" ? ["evidence-unresolved"] : [],
    components:
      integrity === "degraded"
        ? [{ evidenceIds: ["evidence-unresolved"], status: "ACTION_CONFLICT" }]
        : [],
    evidence,
  };
}

describe("composeEffectivePedagogicalReading", () => {
  it("reuses the projector and interpreter and keeps the 5D flag false", () => {
    const input = reading([
      record("evidence-1002", 1002, "difficulty"),
      record("evidence-1003", 1003, "success"),
    ]);
    const composed = composeEffectivePedagogicalReading(input);
    const direct = projectKnowledgeUnitEvidence(
      input.evidence.map((item) => mapEffectiveEvidenceRecord(item).fact),
    ).flatMap((projection) => interpretKnowledgeUnitEvidence(projection));

    expect(composed.interpretations).toEqual(direct);
    expect(composed.interpretations).toHaveLength(1);
    expect(composed.interpretations[0]).toMatchObject({
      policyVersion: "ku-interpretation-v1",
      direction: "mixed",
      support: "opposed",
      evidenceActionsApplied: false,
    });
    expect(composed.interpretations[0]?.reasonCodes).toContain("evidence_actions_not_applied");
    expect(composed.resolverVersion).toBe("effective-evidence-v1");
    expect(composed.actionsApplied).toBe(true);
    expect(composed.provenance.map((item) => item.questionId)).toEqual([1002, 1003]);
    expect(composerSource).toContain("projectKnowledgeUnitEvidence");
    expect(composerSource).toContain("interpretKnowledgeUnitEvidence");
    expect(composerSource).not.toMatch(/evidenceActionsApplied:\s*true/);
    expect(composerSource).not.toMatch(/recommendation|mastery|request_question_delivery/i);
  });

  it("reads success_only after only the success evidence remains effective", () => {
    const composed = composeEffectivePedagogicalReading(
      reading([record("evidence-1003", 1003, "success")]),
    );

    expect(composed.interpretations[0]).toMatchObject({
      direction: "success_only",
      support: "single",
      evidenceActionsApplied: false,
    });
    expect(composed.actionsApplied).toBe(true);
  });

  it("reads difficulty_only after only the difficulty evidence remains effective", () => {
    const composed = composeEffectivePedagogicalReading(
      reading([record("evidence-1002", 1002, "difficulty")]),
    );

    expect(composed.interpretations[0]).toMatchObject({
      direction: "difficulty_only",
      support: "single",
      evidenceActionsApplied: false,
    });
  });

  it("keeps a degraded envelope beside a partial interpretation", () => {
    const composed = composeEffectivePedagogicalReading(
      reading([record("evidence-1003", 1003, "success")], "degraded"),
    );

    expect(composed.integrityStatus).toBe("degraded");
    expect(composed.unresolvedEvidenceIds).toEqual(["evidence-unresolved"]);
    expect(composed.interpretations[0]?.direction).toBe("success_only");
    expect(composed.actionsApplied).toBe(true);
    expect(composed.interpretations[0]?.evidenceActionsApplied).toBe(false);
  });

  it("distinguishes empty ok from empty degraded without an interpretation", () => {
    const ok = composeEffectivePedagogicalReading(reading([]));
    const degraded = composeEffectivePedagogicalReading(reading([], "degraded"));

    expect(ok.interpretations).toEqual([]);
    expect(ok.integrityStatus).toBe("ok");
    expect(degraded.interpretations).toEqual([]);
    expect(degraded.integrityStatus).toBe("degraded");
    expect(degraded.components[0]?.status).toBe("ACTION_CONFLICT");
  });

});
