import type { LearningEvidenceFact } from "@/features/study/types/LearningEvidenceFact";
import type { PedagogicalInterpretation } from "@/features/study/types/PedagogicalInterpretation";

export const EFFECTIVE_EVIDENCE_RESOLVER_VERSION = "effective-evidence-v1" as const;

export const EFFECTIVE_COMPONENT_STATUSES = [
  "SCHEMA_IMPOSSIBLE_STATE",
  "PROFILE_MISMATCH",
  "CYCLE",
  "MULTIPLE_SUCCESSORS",
  "MULTIPLE_PREDECESSORS",
  "ACTION_CONFLICT",
  "PROVENANCE_MISSING",
] as const;

export type EffectiveComponentStatus = (typeof EFFECTIVE_COMPONENT_STATUSES)[number];

export type EffectiveIntegrityStatus = "ok" | "degraded";

export type EffectiveEvidenceRecord = {
  evidenceId: string;
  learningEventId: string;
  questionId: number;
  questionVersionId: string;
  attemptId: string;
  knowledgeUnitId: string;
  knowledgeUnitName: string | null;
  stage: string;
  observation: LearningEvidenceFact["observation"];
  observedAt: string;
  generatedAt: string;
  strength: LearningEvidenceFact["strength"];
  assistanceContext: string;
  timingInterpretation: string;
  producerType: string;
  producerVersion: string;
};

export type EffectiveEvidenceComponent = {
  evidenceIds: readonly string[];
  status: EffectiveComponentStatus;
};

export type EffectiveEvidenceReading = {
  resolverVersion: typeof EFFECTIVE_EVIDENCE_RESOLVER_VERSION;
  actionsApplied: true;
  integrityStatus: EffectiveIntegrityStatus;
  unresolvedEvidenceIds: readonly string[];
  components: readonly EffectiveEvidenceComponent[];
  evidence: readonly EffectiveEvidenceRecord[];
};

export type EffectiveEvidenceProvenance = {
  evidenceId: string;
  learningEventId: string;
  questionId: number;
  questionVersionId: string;
  attemptId: string;
};

export type MappedEffectiveEvidence = {
  fact: LearningEvidenceFact;
  provenance: EffectiveEvidenceProvenance;
};

export type EffectivePedagogicalReading = {
  resolverVersion: typeof EFFECTIVE_EVIDENCE_RESOLVER_VERSION;
  actionsApplied: true;
  integrityStatus: EffectiveIntegrityStatus;
  unresolvedEvidenceIds: readonly string[];
  components: readonly EffectiveEvidenceComponent[];
  provenance: readonly EffectiveEvidenceProvenance[];
  interpretations: readonly PedagogicalInterpretation[];
};
