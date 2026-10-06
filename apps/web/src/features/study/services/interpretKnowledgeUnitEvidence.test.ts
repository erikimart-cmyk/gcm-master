import { describe, expect, it } from "vitest";

import { projectKnowledgeUnitEvidence } from "./projectKnowledgeUnitEvidence";
import { interpretKnowledgeUnitEvidence } from "./interpretKnowledgeUnitEvidence";
import interpreterSource from "./interpretKnowledgeUnitEvidence.ts?raw";
import type { LearningEvidenceFact } from "@/features/study/types/LearningEvidenceFact";
import {
  INTERPRETATION_INPUTS_IGNORED,
  INTERPRETATION_INPUTS_USED,
  KU_INTERPRETATION_POLICY_VERSION,
} from "@/features/study/types/PedagogicalInterpretation";
import type {
  PedagogicalInterpretation,
  PedagogicalReasonCode,
} from "@/features/study/types/PedagogicalInterpretation";
import type {
  KnowledgeUnitEvidenceProjection,
  LearningEvidenceObservation,
  LearningEvidenceStrength,
} from "@/features/study/types/LearningEvidenceFact";

const AUDIT_REASONS = [
  "question_diversity_not_proven",
  "evidence_actions_not_applied",
  "strength_not_used",
  "assistance_not_used",
  "timing_not_used",
] as const satisfies readonly PedagogicalReasonCode[];

const FORBIDDEN_OUTPUT =
  /mastery|mastered|consistent_success|consistent_difficulty|confidence|proficiency|\bscore\b|needsReview|needs_review|priority|nextQuestion|recovered|regressed|improved|worsened|resolved|weakLearner|strongLearner|recommendedAction/i;

function buildProjection(
  knowledgeUnitId: string,
  observations: readonly LearningEvidenceObservation[],
  options?: {
    knowledgeUnitName?: string | null;
    stage?: string;
    stages?: readonly string[];
    strength?: LearningEvidenceStrength;
    assistanceContext?: string;
    timingInterpretation?: string;
  },
): KnowledgeUnitEvidenceProjection {
  const timeline = observations.map((observation, index) => {
    const observedAt = `2026-10-02T00:00:${String(index).padStart(2, "0")}.000Z`;

    return {
      evidenceId: `${knowledgeUnitId}-${index}`,
      observation,
      observedAt,
      generatedAt: observedAt,
      stage: options?.stages?.[index] ?? options?.stage ?? "comprehension",
      strength: options?.strength ?? "weak",
      assistanceContext: options?.assistanceContext ?? "unknown",
      timingInterpretation: options?.timingInterpretation ?? "unknown",
      producerType: "deterministic_rule",
      producerVersion: "m2c-v1",
    };
  });
  const first = timeline[0];
  const last = timeline[timeline.length - 1];

  return {
    knowledgeUnitId,
    knowledgeUnitName: options?.knowledgeUnitName ?? null,
    evidenceCount: timeline.length,
    successCount: observations.filter((observation) => observation === "success").length,
    difficultyCount: observations.filter((observation) => observation === "difficulty").length,
    observedCount: observations.filter((observation) => observation === "observed").length,
    firstObservedAt: first?.observedAt ?? "",
    lastObservedAt: last?.observedAt ?? "",
    latestObservation: last?.observation ?? "observed",
    factualState: "observed",
    timeline,
  };
}

function only(projection: KnowledgeUnitEvidenceProjection): PedagogicalInterpretation {
  const readings = interpretKnowledgeUnitEvidence(projection);
  expect(readings).toHaveLength(1);
  return readings[0];
}

function expectPolicy(reading: PedagogicalInterpretation): void {
  expect(reading.policyVersion).toBe(KU_INTERPRETATION_POLICY_VERSION);
  expect(reading.policyVersion).toBe("ku-interpretation-v1");
  expect(reading.evidenceActionsApplied).toBe(false);
  expect(reading.inputsUsed).toEqual(INTERPRETATION_INPUTS_USED);
  expect(reading.inputsIgnored).toEqual(INTERPRETATION_INPUTS_IGNORED);
  expect(JSON.stringify(reading)).not.toMatch(FORBIDDEN_OUTPUT);
}

function expectReasons(
  reading: PedagogicalInterpretation,
  specific: readonly PedagogicalReasonCode[],
  stageReason: "stage_homogeneous" | "stages_not_collapsed" = "stage_homogeneous",
): void {
  expect(reading.reasonCodes).toEqual([...specific, stageReason, ...AUDIT_REASONS]);
}

describe("interpretKnowledgeUnitEvidence", () => {
  it.each([
    {
      name: "one success",
      observations: ["success"] as const,
      direction: "success_only" as const,
      support: "single" as const,
      reasons: ["single_success_observed", "sequence_ends_with_success"] as const,
    },
    {
      name: "one difficulty",
      observations: ["difficulty"] as const,
      direction: "difficulty_only" as const,
      support: "single" as const,
      reasons: ["single_difficulty_observed", "sequence_ends_with_difficulty"] as const,
    },
    {
      name: "success then success",
      observations: ["success", "success"] as const,
      direction: "success_only" as const,
      support: "repeated_unopposed" as const,
      reasons: ["repeated_success_observed", "sequence_ends_with_success"] as const,
    },
    {
      name: "difficulty then difficulty",
      observations: ["difficulty", "difficulty"] as const,
      direction: "difficulty_only" as const,
      support: "repeated_unopposed" as const,
      reasons: ["repeated_difficulty_observed", "sequence_ends_with_difficulty"] as const,
    },
    {
      name: "difficulty then success",
      observations: ["difficulty", "success"] as const,
      direction: "mixed" as const,
      support: "opposed" as const,
      reasons: ["both_success_and_difficulty_observed", "sequence_ends_with_success"] as const,
    },
    {
      name: "success then difficulty",
      observations: ["success", "difficulty"] as const,
      direction: "mixed" as const,
      support: "opposed" as const,
      reasons: ["both_success_and_difficulty_observed", "sequence_ends_with_difficulty"] as const,
    },
    {
      name: "three successes",
      observations: ["success", "success", "success"] as const,
      direction: "success_only" as const,
      support: "repeated_unopposed" as const,
      reasons: ["repeated_success_observed", "sequence_ends_with_success"] as const,
    },
    {
      name: "three difficulties",
      observations: ["difficulty", "difficulty", "difficulty"] as const,
      direction: "difficulty_only" as const,
      support: "repeated_unopposed" as const,
      reasons: ["repeated_difficulty_observed", "sequence_ends_with_difficulty"] as const,
    },
    {
      name: "difficulty then two successes",
      observations: ["difficulty", "success", "success"] as const,
      direction: "mixed" as const,
      support: "opposed" as const,
      reasons: ["both_success_and_difficulty_observed", "sequence_ends_with_success"] as const,
    },
    {
      name: "success then two difficulties",
      observations: ["success", "difficulty", "difficulty"] as const,
      direction: "mixed" as const,
      support: "opposed" as const,
      reasons: ["both_success_and_difficulty_observed", "sequence_ends_with_difficulty"] as const,
    },
    {
      name: "difficulty, success, difficulty",
      observations: ["difficulty", "success", "difficulty"] as const,
      direction: "mixed" as const,
      support: "opposed" as const,
      reasons: ["both_success_and_difficulty_observed", "sequence_ends_with_difficulty"] as const,
    },
    {
      name: "success, difficulty, success",
      observations: ["success", "difficulty", "success"] as const,
      direction: "mixed" as const,
      support: "opposed" as const,
      reasons: ["both_success_and_difficulty_observed", "sequence_ends_with_success"] as const,
    },
    {
      name: "two successes then difficulty",
      observations: ["success", "success", "difficulty"] as const,
      direction: "mixed" as const,
      support: "opposed" as const,
      reasons: ["both_success_and_difficulty_observed", "sequence_ends_with_difficulty"] as const,
    },
    {
      name: "two difficulties then success",
      observations: ["difficulty", "difficulty", "success"] as const,
      direction: "mixed" as const,
      support: "opposed" as const,
      reasons: ["both_success_and_difficulty_observed", "sequence_ends_with_success"] as const,
    },
  ])("$name stays descriptive", ({ observations, direction, support, reasons }) => {
    const reading = only(buildProjection("ku", observations));

    expect(reading.direction).toBe(direction);
    expect(reading.support).toBe(support);
    expect(reading.stageScope).toBe("comprehension");
    expect(reading.latestObservation).toBe(observations[observations.length - 1]);
    expectReasons(reading, reasons);
    expectPolicy(reading);
  });

  it("reads one non-directional observation without inventing a direction", () => {
    const reading = only(buildProjection("ku-observed", ["observed"]));

    expect(reading.direction).toBe("non_directional");
    expect(reading.support).toBe("single");
    expect(reading.latestObservation).toBe("observed");
    expectReasons(reading, ["single_non_directional_observation"]);
    expect(reading.reasonCodes).not.toContain("sequence_ends_with_success");
    expect(reading.reasonCodes).not.toContain("sequence_ends_with_difficulty");
  });

  it("refuses several non-directional observations in one stage", () => {
    expect(() => interpretKnowledgeUnitEvidence(buildProjection("ku-observed", ["observed", "observed"]))).toThrow(
      /não representa support/,
    );
  });

  it("refuses one directional observation accompanied only by a non-directional observation", () => {
    expect(() =>
      interpretKnowledgeUnitEvidence(buildProjection("ku-gap", ["success", "observed"])),
    ).toThrow(/não representa support/);
  });

  it("keeps repeated success when extra non-directional observations are not opposition", () => {
    const reading = only(buildProjection("ku-extra", ["success", "success", "observed"]));

    expect(reading.direction).toBe("success_only");
    expect(reading.support).toBe("repeated_unopposed");
    expect(reading.latestObservation).toBe("observed");
    expectReasons(reading, ["repeated_success_observed"]);
    expect(reading.reasonCodes).not.toContain("sequence_ends_with_success");
  });

  it("keeps opposition when a non-directional observation is also present", () => {
    const reading = only(buildProjection("ku-mixed-observed", ["success", "observed", "difficulty"]));

    expect(reading.direction).toBe("mixed");
    expect(reading.support).toBe("opposed");
    expectReasons(reading, [
      "both_success_and_difficulty_observed",
      "sequence_ends_with_difficulty",
    ]);
  });

  it("keeps a homogeneous comprehension stage", () => {
    const reading = only(
      buildProjection("percentage-change", ["difficulty"], {
        stage: "comprehension",
        knowledgeUnitName: "Variação percentual",
      }),
    );

    expect(reading.stageScope).toBe("comprehension");
    expect(reading.knowledgeUnitName).toBe("Variação percentual");
    expect(reading.reasonCodes).toContain("stage_homogeneous");
    expect(reading.reasonCodes).not.toContain("stages_not_collapsed");
  });

  it("keeps a homogeneous application stage from a local fixture", () => {
    const reading = only(
      buildProjection("local-application", ["success"], {
        stage: "application",
      }),
    );

    expect(reading.stageScope).toBe("application");
    expect(reading.direction).toBe("success_only");
    expect(reading.support).toBe("single");
    expectReasons(reading, ["single_success_observed", "sequence_ends_with_success"]);
  });

  it("does not collapse success in comprehension with difficulty in retention", () => {
    const readings = interpretKnowledgeUnitEvidence(
      buildProjection("ku-stages", ["success", "difficulty"], {
        stages: ["comprehension", "retention"],
        knowledgeUnitName: "Separação de stage",
      }),
    );

    expect(readings.map((reading) => reading.stageScope)).toEqual(["comprehension", "retention"]);
    expect(readings[0]).toMatchObject({
      direction: "success_only",
      support: "single",
      latestObservation: "success",
      knowledgeUnitName: "Separação de stage",
    });
    expect(readings[1]).toMatchObject({
      direction: "difficulty_only",
      support: "single",
      latestObservation: "difficulty",
    });
    expectReasons(readings[0], ["single_success_observed", "sequence_ends_with_success"], "stages_not_collapsed");
    expectReasons(
      readings[1],
      ["single_difficulty_observed", "sequence_ends_with_difficulty"],
      "stages_not_collapsed",
    );
    expect(JSON.stringify(readings)).not.toMatch(/"direction":"mixed"/);
    expect(readings.every((reading) => reading.evidenceActionsApplied === false)).toBe(true);
  });

  it("does not let ten successes outvote one difficulty in the same stage", () => {
    const reading = only(
      buildProjection("ku-majority", [
        ...Array.from({ length: 10 }, () => "success" as const),
        "difficulty",
      ]),
    );

    expect(reading.direction).toBe("mixed");
    expect(reading.support).toBe("opposed");
    expect(reading.direction).not.toBe("success_only");
    expectReasons(reading, [
      "both_success_and_difficulty_observed",
      "sequence_ends_with_difficulty",
    ]);
  });

  it("does not let ten difficulties outvote one success in the same stage", () => {
    const reading = only(
      buildProjection("ku-majority", [
        "success",
        ...Array.from({ length: 10 }, () => "difficulty" as const),
      ]),
    );

    expect(reading.direction).toBe("mixed");
    expect(reading.support).toBe("opposed");
    expect(reading.direction).not.toBe("difficulty_only");
    expectReasons(reading, [
      "both_success_and_difficulty_observed",
      "sequence_ends_with_difficulty",
    ]);
  });

  it("does not let a latest success replace earlier difficulty", () => {
    const reading = only(
      buildProjection("ku-latest", [
        "difficulty",
        ...Array.from({ length: 10 }, () => "success" as const),
      ]),
    );

    expect(reading.latestObservation).toBe("success");
    expect(reading.direction).toBe("mixed");
    expect(reading.support).toBe("opposed");
    expectReasons(reading, ["both_success_and_difficulty_observed", "sequence_ends_with_success"]);
  });

  it("does not let a latest difficulty replace earlier success", () => {
    const reading = only(
      buildProjection("ku-latest", [
        ...Array.from({ length: 10 }, () => "success" as const),
        "difficulty",
      ]),
    );

    expect(reading.latestObservation).toBe("difficulty");
    expect(reading.direction).toBe("mixed");
    expect(reading.support).toBe("opposed");
    expectReasons(reading, [
      "both_success_and_difficulty_observed",
      "sequence_ends_with_difficulty",
    ]);
  });

  it("emits reason codes in a stable order", () => {
    const projection = buildProjection("ku-order", ["difficulty", "success"]);
    const first = only(projection);
    const second = only(projection);

    expect(first.reasonCodes).toEqual(second.reasonCodes);
    expect(first.reasonCodes).toEqual([
      "both_success_and_difficulty_observed",
      "sequence_ends_with_success",
      "stage_homogeneous",
      ...AUDIT_REASONS,
    ]);
  });

  it("preserves the policy version and the untouched evidence action flag", () => {
    const reading = only(buildProjection("ku-policy", ["success"]));

    expectPolicy(reading);
    expect(reading.evidenceActionsApplied).toBe(false);
  });

  it("does not change the reading when strength changes", () => {
    const weak = buildProjection("ku-strength", ["success", "difficulty"], { strength: "weak" });
    const strong = buildProjection("ku-strength", ["success", "difficulty"], { strength: "strong" });

    expect(interpretKnowledgeUnitEvidence(weak)).toEqual(interpretKnowledgeUnitEvidence(strong));
  });

  it("does not change the reading when assistance changes", () => {
    const unknown = buildProjection("ku-assistance", ["success"], {
      assistanceContext: "unknown",
    });
    const exposed = buildProjection("ku-assistance", ["success"], {
      assistanceContext: "answer_exposed",
    });

    expect(interpretKnowledgeUnitEvidence(unknown)).toEqual(interpretKnowledgeUnitEvidence(exposed));
  });

  it("does not change the reading when timing changes", () => {
    const unknown = buildProjection("ku-timing", ["difficulty"], {
      timingInterpretation: "unknown",
    });
    const comparable = buildProjection("ku-timing", ["difficulty"], {
      timingInterpretation: "comparable",
    });

    expect(interpretKnowledgeUnitEvidence(unknown)).toEqual(
      interpretKnowledgeUnitEvidence(comparable),
    );
  });

  it("preserves a knowledge unit name and a missing name", () => {
    const named = only(
      buildProjection("percentage-of-quantity", ["success"], {
        knowledgeUnitName: "Porcentagem de uma quantidade",
      }),
    );
    const unnamed = only(buildProjection("percentage-of-quantity", ["success"]));

    expect(named.knowledgeUnitId).toBe("percentage-of-quantity");
    expect(named.knowledgeUnitName).toBe("Porcentagem de uma quantidade");
    expect(unnamed.knowledgeUnitName).toBeNull();
  });

  it("refuses an empty projection instead of inventing a reading", () => {
    expect(() => interpretKnowledgeUnitEvidence(buildProjection("ku-empty", []))).toThrow(
      /não contém evidência/,
    );
  });

  it("refuses a projection whose counts do not match the timeline", () => {
    const projection = buildProjection("ku-bad", ["success"]);

    expect(() =>
      interpretKnowledgeUnitEvidence({
        ...projection,
        successCount: 4,
      }),
    ).toThrow(/não confere com a timeline/);
  });

  it("reads one observed fact per stage without collapsing those stages", () => {
    const readings = interpretKnowledgeUnitEvidence(
      buildProjection("ku-observed-stages", ["observed", "observed"], {
        stages: ["exposure", "retention"],
      }),
    );

    expect(readings).toHaveLength(2);
    expect(readings.map((reading) => reading.stageScope)).toEqual(["exposure", "retention"]);
    expect(readings.every((reading) => reading.direction === "non_directional")).toBe(true);
    expect(readings.every((reading) => reading.support === "single")).toBe(true);
    expect(readings.every((reading) => reading.reasonCodes.includes("stages_not_collapsed"))).toBe(
      true,
    );
  });

  it("interprets the local smoke chronicle without a diagnostic label", () => {
    const names = {
      "percentage-of-quantity": "Porcentagem de uma quantidade",
      "percentage-increase-decrease": "Aumento e desconto percentual",
      "reverse-percentage": "Porcentagem reversa",
      "percentage-change": "Variação percentual",
    } as const;

    function fact(
      input: Pick<LearningEvidenceFact, "evidenceId" | "knowledgeUnitId" | "observation" | "observedAt"> &
        Partial<LearningEvidenceFact>,
    ): LearningEvidenceFact {
      return {
        knowledgeUnitName: names[input.knowledgeUnitId as keyof typeof names],
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

    const readings = projectKnowledgeUnitEvidence([
      fact({
        evidenceId: "ev-change",
        knowledgeUnitId: "percentage-change",
        observation: "difficulty",
        observedAt: "2026-10-02T23:03:09.839649+00:00",
      }),
      fact({
        evidenceId: "ev-quantity",
        knowledgeUnitId: "percentage-of-quantity",
        observation: "success",
        observedAt: "2026-10-02T07:06:55.853184+00:00",
      }),
      fact({
        evidenceId: "ev-increase-success",
        knowledgeUnitId: "percentage-increase-decrease",
        observation: "success",
        observedAt: "2026-10-02T21:16:56.846988+00:00",
      }),
      fact({
        evidenceId: "ev-reverse",
        knowledgeUnitId: "reverse-percentage",
        observation: "success",
        observedAt: "2026-10-02T21:59:32.432621+00:00",
      }),
      fact({
        evidenceId: "ev-increase-difficulty",
        knowledgeUnitId: "percentage-increase-decrease",
        observation: "difficulty",
        observedAt: "2026-10-02T07:23:59.720173+00:00",
      }),
    ]).flatMap((projection) => interpretKnowledgeUnitEvidence(projection));

    const byUnit = new Map(readings.map((reading) => [reading.knowledgeUnitId, reading]));

    expect(byUnit.get("percentage-of-quantity")).toMatchObject({
      direction: "success_only",
      support: "single",
      stageScope: "comprehension",
      knowledgeUnitName: names["percentage-of-quantity"],
      latestObservation: "success",
    });
    expect(byUnit.get("percentage-increase-decrease")).toMatchObject({
      direction: "mixed",
      support: "opposed",
      stageScope: "comprehension",
      latestObservation: "success",
    });
    expect(byUnit.get("reverse-percentage")).toMatchObject({
      direction: "success_only",
      support: "single",
      stageScope: "comprehension",
    });
    expect(byUnit.get("percentage-change")).toMatchObject({
      direction: "difficulty_only",
      support: "single",
      stageScope: "comprehension",
      latestObservation: "difficulty",
    });
    expectReasons(byUnit.get("percentage-increase-decrease") as PedagogicalInterpretation, [
      "both_success_and_difficulty_observed",
      "sequence_ends_with_success",
    ]);
    expect(JSON.stringify(readings)).not.toMatch(FORBIDDEN_OUTPUT);
    expect(readings).toHaveLength(4);
  });

  it("keeps diagnostic and delivery words out of the interpreter source", () => {
    expect(interpreterSource).not.toMatch(FORBIDDEN_OUTPUT);
    expect(interpreterSource).not.toMatch(
      /supabase|from ["']react["']|request_question_delivery|DashboardPage|ReviewPage/,
    );
    expect(interpreterSource).toContain("evidenceActionsApplied: false");
    expect(interpreterSource).toContain("ku-interpretation-v1");
  });
});
