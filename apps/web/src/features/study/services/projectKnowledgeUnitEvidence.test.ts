import { describe, expect, it } from "vitest";

import { projectKnowledgeUnitEvidence } from "./projectKnowledgeUnitEvidence";
import projectorSource from "./projectKnowledgeUnitEvidence.ts?raw";
import type { LearningEvidenceFact } from "@/features/study/types/LearningEvidenceFact";

function fact(
  input: Pick<
    LearningEvidenceFact,
    "evidenceId" | "knowledgeUnitId" | "observation" | "observedAt"
  > &
    Partial<LearningEvidenceFact>,
): LearningEvidenceFact {
  return {
    knowledgeUnitName: null,
    stage: "comprehension",
    strength: "weak",
    assistanceContext: "unknown",
    timingInterpretation: "unknown",
    producerType: "deterministic_rule",
    producerVersion: "m2c-v1",
    generatedAt: input.observedAt,
    ...input,
  };
}

const names = {
  "percentage-of-quantity": "Porcentagem de uma quantidade",
  "percentage-increase-decrease": "Aumento e desconto percentual",
  "reverse-percentage": "Porcentagem reversa",
  "percentage-change": "Variação percentual",
} as const;

describe("projectKnowledgeUnitEvidence", () => {
  it("returns no projection for an empty list", () => {
    expect(projectKnowledgeUnitEvidence([])).toEqual([]);
  });

  it("projects one success without a mastery label", () => {
    const [projection] = projectKnowledgeUnitEvidence([
      fact({
        evidenceId: "e1",
        knowledgeUnitId: "percentage-of-quantity",
        knowledgeUnitName: names["percentage-of-quantity"],
        observation: "success",
        observedAt: "2026-10-02T07:06:55.853184+00:00",
      }),
    ]);

    expect(projection).toMatchObject({
      knowledgeUnitId: "percentage-of-quantity",
      knowledgeUnitName: names["percentage-of-quantity"],
      evidenceCount: 1,
      successCount: 1,
      difficultyCount: 0,
      observedCount: 0,
      latestObservation: "success",
      factualState: "observed",
    });
    expect(projection.timeline.map((entry) => entry.observation)).toEqual(["success"]);
  });

  it("projects one difficulty without a deficit label", () => {
    const [projection] = projectKnowledgeUnitEvidence([
      fact({
        evidenceId: "e5",
        knowledgeUnitId: "percentage-change",
        observation: "difficulty",
        observedAt: "2026-10-02T23:03:09.839649+00:00",
      }),
    ]);

    expect(projection).toMatchObject({
      evidenceCount: 1,
      successCount: 0,
      difficultyCount: 1,
      latestObservation: "difficulty",
      factualState: "observed",
    });
    expect(projection.timeline.map((entry) => entry.observation)).toEqual(["difficulty"]);
  });

  it("keeps difficulty followed by success", () => {
    const [projection] = projectKnowledgeUnitEvidence([
      fact({
        evidenceId: "e2",
        knowledgeUnitId: "percentage-increase-decrease",
        observation: "difficulty",
        observedAt: "2026-10-02T07:23:59.720173+00:00",
      }),
      fact({
        evidenceId: "e3",
        knowledgeUnitId: "percentage-increase-decrease",
        observation: "success",
        observedAt: "2026-10-02T21:16:56.846988+00:00",
      }),
    ]);

    expect(projection).toMatchObject({
      evidenceCount: 2,
      successCount: 1,
      difficultyCount: 1,
      latestObservation: "success",
      firstObservedAt: "2026-10-02T07:23:59.720173+00:00",
      lastObservedAt: "2026-10-02T21:16:56.846988+00:00",
    });
    expect(projection.timeline.map((entry) => entry.observation)).toEqual([
      "difficulty",
      "success",
    ]);
    expect(projection.timeline).toHaveLength(2);
  });

  it("keeps success followed by difficulty", () => {
    const [projection] = projectKnowledgeUnitEvidence([
      fact({
        evidenceId: "later",
        knowledgeUnitId: "percentage-change",
        observation: "difficulty",
        observedAt: "2026-10-03T00:00:00.000Z",
      }),
      fact({
        evidenceId: "earlier",
        knowledgeUnitId: "percentage-change",
        observation: "success",
        observedAt: "2026-10-02T00:00:00.000Z",
      }),
    ]);

    expect(projection.timeline.map((entry) => entry.observation)).toEqual([
      "success",
      "difficulty",
    ]);
    expect(projection.latestObservation).toBe("difficulty");
    expect(projection.successCount).toBe(1);
    expect(projection.difficultyCount).toBe(1);
  });

  it("keeps every success", () => {
    const [projection] = projectKnowledgeUnitEvidence([
      fact({
        evidenceId: "s3",
        knowledgeUnitId: "percentage-of-quantity",
        observation: "success",
        observedAt: "2026-10-03T00:00:00.000Z",
      }),
      fact({
        evidenceId: "s1",
        knowledgeUnitId: "percentage-of-quantity",
        observation: "success",
        observedAt: "2026-10-01T00:00:00.000Z",
      }),
      fact({
        evidenceId: "s2",
        knowledgeUnitId: "percentage-of-quantity",
        observation: "success",
        observedAt: "2026-10-02T00:00:00.000Z",
      }),
    ]);

    expect(projection.successCount).toBe(3);
    expect(projection.difficultyCount).toBe(0);
    expect(projection.evidenceCount).toBe(3);
    expect(projection.timeline.map((entry) => entry.evidenceId)).toEqual(["s1", "s2", "s3"]);
  });

  it("keeps every difficulty", () => {
    const [projection] = projectKnowledgeUnitEvidence([
      fact({
        evidenceId: "d2",
        knowledgeUnitId: "percentage-change",
        observation: "difficulty",
        observedAt: "2026-10-02T00:00:00.000Z",
      }),
      fact({
        evidenceId: "d1",
        knowledgeUnitId: "percentage-change",
        observation: "difficulty",
        observedAt: "2026-10-01T00:00:00.000Z",
      }),
    ]);

    expect(projection.difficultyCount).toBe(2);
    expect(projection.successCount).toBe(0);
    expect(projection.timeline.map((entry) => entry.evidenceId)).toEqual(["d1", "d2"]);
  });

  it("does not move evidence between knowledge units", () => {
    const projections = projectKnowledgeUnitEvidence([
      fact({
        evidenceId: "a",
        knowledgeUnitId: "percentage-change",
        observation: "difficulty",
        observedAt: "2026-10-02T00:00:00.000Z",
      }),
      fact({
        evidenceId: "b",
        knowledgeUnitId: "reverse-percentage",
        observation: "success",
        observedAt: "2026-10-01T00:00:00.000Z",
      }),
    ]);

    expect(projections.map((projection) => projection.knowledgeUnitId)).toEqual([
      "percentage-change",
      "reverse-percentage",
    ]);
    expect(projections[0].timeline.map((entry) => entry.evidenceId)).toEqual(["a"]);
    expect(projections[1].timeline.map((entry) => entry.evidenceId)).toEqual(["b"]);
  });

  it("sorts a shuffled input by observed time", () => {
    const [projection] = projectKnowledgeUnitEvidence([
      fact({
        evidenceId: "third",
        knowledgeUnitId: "percentage-of-quantity",
        observation: "success",
        observedAt: "2026-10-03T00:00:00.000Z",
      }),
      fact({
        evidenceId: "first",
        knowledgeUnitId: "percentage-of-quantity",
        observation: "difficulty",
        observedAt: "2026-10-01T00:00:00.000Z",
      }),
      fact({
        evidenceId: "second",
        knowledgeUnitId: "percentage-of-quantity",
        observation: "observed",
        observedAt: "2026-10-02T00:00:00.000Z",
      }),
    ]);

    expect(projection.timeline.map((entry) => entry.evidenceId)).toEqual([
      "first",
      "second",
      "third",
    ]);
    expect(projection.observedCount).toBe(1);
    expect(projection.evidenceCount).toBe(3);
  });

  it("breaks equal observed_at by generated_at and then evidence id", () => {
    const [projection] = projectKnowledgeUnitEvidence([
      fact({
        evidenceId: "b",
        knowledgeUnitId: "percentage-change",
        observation: "difficulty",
        observedAt: "2026-10-02T00:00:00.000Z",
        generatedAt: "2026-10-02T00:00:00.000Z",
      }),
      fact({
        evidenceId: "a",
        knowledgeUnitId: "percentage-change",
        observation: "success",
        observedAt: "2026-10-02T00:00:00.000Z",
        generatedAt: "2026-10-02T00:00:00.000Z",
      }),
      fact({
        evidenceId: "z",
        knowledgeUnitId: "percentage-change",
        observation: "observed",
        observedAt: "2026-10-02T00:00:00.000Z",
        generatedAt: "2026-10-01T00:00:00.000Z",
      }),
    ]);

    expect(projection.timeline.map((entry) => entry.evidenceId)).toEqual(["z", "a", "b"]);
  });

  it("projects the confirmed smoke chronicle without adding a pedagogical label", () => {
    const projections = projectKnowledgeUnitEvidence([
      fact({
        evidenceId: "1005",
        knowledgeUnitId: "percentage-change",
        knowledgeUnitName: names["percentage-change"],
        observation: "difficulty",
        observedAt: "2026-10-02T23:03:09.839649+00:00",
      }),
      fact({
        evidenceId: "1001",
        knowledgeUnitId: "percentage-of-quantity",
        knowledgeUnitName: names["percentage-of-quantity"],
        observation: "success",
        observedAt: "2026-10-02T07:06:55.853184+00:00",
      }),
      fact({
        evidenceId: "1003",
        knowledgeUnitId: "percentage-increase-decrease",
        knowledgeUnitName: names["percentage-increase-decrease"],
        observation: "success",
        observedAt: "2026-10-02T21:16:56.846988+00:00",
      }),
      fact({
        evidenceId: "1004",
        knowledgeUnitId: "reverse-percentage",
        knowledgeUnitName: names["reverse-percentage"],
        observation: "success",
        observedAt: "2026-10-02T21:59:32.432621+00:00",
      }),
      fact({
        evidenceId: "1002",
        knowledgeUnitId: "percentage-increase-decrease",
        knowledgeUnitName: names["percentage-increase-decrease"],
        observation: "difficulty",
        observedAt: "2026-10-02T07:23:59.720173+00:00",
      }),
    ]);

    expect(projections).toEqual([
      expect.objectContaining({
        knowledgeUnitId: "percentage-change",
        evidenceCount: 1,
        successCount: 0,
        difficultyCount: 1,
        latestObservation: "difficulty",
      }),
      expect.objectContaining({
        knowledgeUnitId: "percentage-increase-decrease",
        evidenceCount: 2,
        successCount: 1,
        difficultyCount: 1,
        latestObservation: "success",
      }),
      expect.objectContaining({
        knowledgeUnitId: "percentage-of-quantity",
        evidenceCount: 1,
        successCount: 1,
        difficultyCount: 0,
        latestObservation: "success",
      }),
      expect.objectContaining({
        knowledgeUnitId: "reverse-percentage",
        evidenceCount: 1,
        successCount: 1,
        difficultyCount: 0,
        latestObservation: "success",
      }),
    ]);
    expect(
      projections
        .find((projection) => projection.knowledgeUnitId === "percentage-increase-decrease")
        ?.timeline.map((entry) => entry.observation),
    ).toEqual(["difficulty", "success"]);
    expect(JSON.stringify(projections)).not.toMatch(
      /mastery|mastered|proficiency|confidence|precisa revisar|domínio/i,
    );
    expect(projectorSource).not.toMatch(
      /mastery|mastered|proficiency|confidence|evidenceCount >=|successCount >/i,
    );
  });
});
