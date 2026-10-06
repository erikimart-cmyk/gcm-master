import type { LearningEvidenceObservation } from "@/features/study/types/LearningEvidenceFact";

export const KU_INTERPRETATION_POLICY_VERSION = "ku-interpretation-v1" as const;

export type EvidenceDirection =
  | "success_only"
  | "difficulty_only"
  | "mixed"
  | "non_directional";

export type EvidenceSupport = "single" | "repeated_unopposed" | "opposed";

export const PEDAGOGICAL_REASON_CODES = [
  "single_success_observed",
  "single_difficulty_observed",
  "single_non_directional_observation",
  "repeated_success_observed",
  "repeated_difficulty_observed",
  "both_success_and_difficulty_observed",
  "sequence_ends_with_success",
  "sequence_ends_with_difficulty",
  "stage_homogeneous",
  "stages_not_collapsed",
  "question_diversity_not_proven",
  "evidence_actions_not_applied",
  "strength_not_used",
  "assistance_not_used",
  "timing_not_used",
] as const;

export type PedagogicalReasonCode = (typeof PEDAGOGICAL_REASON_CODES)[number];

export const INTERPRETATION_INPUTS_USED = [
  "knowledgeUnitId",
  "knowledgeUnitName",
  "stage",
  "observation",
  "successCount",
  "difficultyCount",
  "observedCount",
  "timelineOrder",
  "latestObservation",
] as const;

export type InterpretationInputUsed = (typeof INTERPRETATION_INPUTS_USED)[number];

export const INTERPRETATION_INPUTS_IGNORED = [
  "strength",
  "assistanceContext",
  "timingInterpretation",
  "editorialDifficulty",
  "subject",
  "questionIdentity",
  "evidenceActions",
  "decay",
] as const;

export type InterpretationInputIgnored = (typeof INTERPRETATION_INPUTS_IGNORED)[number];

export type PedagogicalInterpretation = {
  policyVersion: typeof KU_INTERPRETATION_POLICY_VERSION;
  knowledgeUnitId: string;
  knowledgeUnitName: string | null;
  stageScope: string;
  direction: EvidenceDirection;
  support: EvidenceSupport;
  reasonCodes: PedagogicalReasonCode[];
  latestObservation: LearningEvidenceObservation;
  inputsUsed: readonly InterpretationInputUsed[];
  inputsIgnored: readonly InterpretationInputIgnored[];
  evidenceActionsApplied: false;
};
