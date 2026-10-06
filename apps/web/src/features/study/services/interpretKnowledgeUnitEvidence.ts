import type {
  KnowledgeUnitEvidenceProjection,
  KnowledgeUnitEvidenceTimelineEntry,
  LearningEvidenceObservation,
} from "@/features/study/types/LearningEvidenceFact";
import {
  INTERPRETATION_INPUTS_IGNORED,
  INTERPRETATION_INPUTS_USED,
  KU_INTERPRETATION_POLICY_VERSION,
  PEDAGOGICAL_REASON_CODES,
} from "@/features/study/types/PedagogicalInterpretation";
import type {
  EvidenceDirection,
  EvidenceSupport,
  PedagogicalInterpretation,
  PedagogicalReasonCode,
} from "@/features/study/types/PedagogicalInterpretation";

// ku-interpretation-v1 reads one KnowledgeUnitEvidenceProjection.
// It does not persist, recommend, or choose a question.
// evidence_actions are not applied.
// strength, assistance and timing are ignored.
// A KnowledgeUnit with more than one stage yields one reading per stage.
// Those readings are not folded into one direction.
// The cardinality 2 distinguishes single from repeated_unopposed.
// That distinction describes the sequence. It is not a learning diagnosis.
// Two or more non-directional observations in one stage, and one directional
// observation accompanied only by non-directional observations, have no
// approved support value. Those inputs are refused.

const REPEATED_UNOPPOSED_CARDINALITY = 2;

const emptyProjectionMessage = "A projeção não contém evidência para interpretar.";
const inconsistentProjectionMessage = "A projeção factual não confere com a timeline.";

type ObservationCounts = {
  success: number;
  difficulty: number;
  observed: number;
};

function countObservations(
  entries: readonly KnowledgeUnitEvidenceTimelineEntry[],
): ObservationCounts {
  let success = 0;
  let difficulty = 0;
  let observed = 0;

  for (const entry of entries) {
    if (entry.observation === "success") {
      success += 1;
    }
    if (entry.observation === "difficulty") {
      difficulty += 1;
    }
    if (entry.observation === "observed") {
      observed += 1;
    }
  }

  return { success, difficulty, observed };
}

function assertProjection(projection: KnowledgeUnitEvidenceProjection): void {
  if (projection.timeline.length === 0 || projection.evidenceCount === 0) {
    throw new Error(emptyProjectionMessage);
  }

  if (projection.knowledgeUnitId.trim().length === 0 || projection.factualState !== "observed") {
    throw new Error(inconsistentProjectionMessage);
  }

  const counts = countObservations(projection.timeline);
  const first = projection.timeline[0];
  const last = projection.timeline[projection.timeline.length - 1];
  const counted = counts.success + counts.difficulty + counts.observed;
  const consistent =
    projection.evidenceCount === projection.timeline.length &&
    counted === projection.timeline.length &&
    projection.successCount === counts.success &&
    projection.difficultyCount === counts.difficulty &&
    projection.observedCount === counts.observed &&
    projection.firstObservedAt === first.observedAt &&
    projection.lastObservedAt === last.observedAt &&
    projection.latestObservation === last.observation &&
    projection.timeline.every((entry) => entry.stage.trim().length > 0);

  if (!consistent) {
    throw new Error(inconsistentProjectionMessage);
  }
}

function assertRepresentableSupport(stage: string, counts: ObservationCounts): void {
  if (counts.success > 0 && counts.difficulty > 0) {
    return;
  }

  const directional = counts.success + counts.difficulty;
  const total = directional + counts.observed;

  if (total === 1) {
    return;
  }

  if (
    directional >= REPEATED_UNOPPOSED_CARDINALITY &&
    (counts.success === 0 || counts.difficulty === 0)
  ) {
    return;
  }

  throw new Error(
    `${KU_INTERPRETATION_POLICY_VERSION} não representa support no stage ${stage}: success ${counts.success}, difficulty ${counts.difficulty}, observed ${counts.observed}.`,
  );
}

function directionOf(counts: ObservationCounts): EvidenceDirection {
  if (counts.success > 0 && counts.difficulty > 0) {
    return "mixed";
  }

  if (counts.success > 0) {
    return "success_only";
  }

  if (counts.difficulty > 0) {
    return "difficulty_only";
  }

  return "non_directional";
}

function supportOf(counts: ObservationCounts): EvidenceSupport {
  if (counts.success > 0 && counts.difficulty > 0) {
    return "opposed";
  }

  if (counts.success + counts.difficulty + counts.observed === 1) {
    return "single";
  }

  return "repeated_unopposed";
}

function applicableReasonCodes(
  direction: EvidenceDirection,
  support: EvidenceSupport,
  latestObservation: LearningEvidenceObservation,
  multipleStages: boolean,
): PedagogicalReasonCode[] {
  const applicable = new Set<PedagogicalReasonCode>();

  if (direction === "success_only" && support === "single") {
    applicable.add("single_success_observed");
  }
  if (direction === "difficulty_only" && support === "single") {
    applicable.add("single_difficulty_observed");
  }
  if (direction === "non_directional" && support === "single") {
    applicable.add("single_non_directional_observation");
  }
  if (direction === "success_only" && support === "repeated_unopposed") {
    applicable.add("repeated_success_observed");
  }
  if (direction === "difficulty_only" && support === "repeated_unopposed") {
    applicable.add("repeated_difficulty_observed");
  }
  if (direction === "mixed") {
    applicable.add("both_success_and_difficulty_observed");
  }
  if (latestObservation === "success") {
    applicable.add("sequence_ends_with_success");
  }
  if (latestObservation === "difficulty") {
    applicable.add("sequence_ends_with_difficulty");
  }
  if (multipleStages) {
    applicable.add("stages_not_collapsed");
  } else {
    applicable.add("stage_homogeneous");
  }

  applicable.add("question_diversity_not_proven");
  applicable.add("evidence_actions_not_applied");
  applicable.add("strength_not_used");
  applicable.add("assistance_not_used");
  applicable.add("timing_not_used");

  return PEDAGOGICAL_REASON_CODES.filter((reasonCode) => applicable.has(reasonCode));
}

function interpretStage(
  projection: KnowledgeUnitEvidenceProjection,
  stage: string,
  entries: readonly KnowledgeUnitEvidenceTimelineEntry[],
  multipleStages: boolean,
): PedagogicalInterpretation {
  const latest = entries[entries.length - 1];
  if (!latest) {
    throw new Error(emptyProjectionMessage);
  }

  const counts = countObservations(entries);
  assertRepresentableSupport(stage, counts);
  const direction = directionOf(counts);
  const support = supportOf(counts);

  return {
    policyVersion: KU_INTERPRETATION_POLICY_VERSION,
    knowledgeUnitId: projection.knowledgeUnitId,
    knowledgeUnitName: projection.knowledgeUnitName,
    stageScope: stage,
    direction,
    support,
    reasonCodes: applicableReasonCodes(direction, support, latest.observation, multipleStages),
    latestObservation: latest.observation,
    inputsUsed: INTERPRETATION_INPUTS_USED,
    inputsIgnored: INTERPRETATION_INPUTS_IGNORED,
    evidenceActionsApplied: false,
  };
}

export function interpretKnowledgeUnitEvidence(
  projection: KnowledgeUnitEvidenceProjection,
): readonly PedagogicalInterpretation[] {
  assertProjection(projection);

  const grouped = new Map<string, KnowledgeUnitEvidenceTimelineEntry[]>();

  for (const entry of projection.timeline) {
    const current = grouped.get(entry.stage);
    if (current) {
      current.push(entry);
    } else {
      grouped.set(entry.stage, [entry]);
    }
  }

  const stages = Array.from(grouped.keys()).sort((left, right) => left.localeCompare(right));
  const multipleStages = stages.length > 1;

  return stages.map((stage) =>
    interpretStage(projection, stage, grouped.get(stage) ?? [], multipleStages),
  );
}
