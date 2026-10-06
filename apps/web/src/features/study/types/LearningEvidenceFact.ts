export type LearningEvidenceObservation = "observed" | "success" | "difficulty";

export type LearningEvidenceStrength = "weak" | "moderate" | "strong";

export type LearningEvidenceFact = {
  evidenceId: string;
  knowledgeUnitId: string;
  knowledgeUnitName: string | null;
  observation: LearningEvidenceObservation;
  stage: string;
  strength: LearningEvidenceStrength;
  assistanceContext: string;
  timingInterpretation: string;
  producerType: string;
  producerVersion: string;
  observedAt: string;
  generatedAt: string;
};

export type KnowledgeUnitEvidenceTimelineEntry = {
  evidenceId: string;
  observation: LearningEvidenceObservation;
  observedAt: string;
  generatedAt: string;
  stage: string;
  strength: LearningEvidenceStrength;
  assistanceContext: string;
  timingInterpretation: string;
  producerType: string;
  producerVersion: string;
};

export type KnowledgeUnitEvidenceProjection = {
  knowledgeUnitId: string;
  knowledgeUnitName: string | null;
  evidenceCount: number;
  successCount: number;
  difficultyCount: number;
  observedCount: number;
  firstObservedAt: string;
  lastObservedAt: string;
  latestObservation: LearningEvidenceObservation;
  factualState: "observed";
  timeline: KnowledgeUnitEvidenceTimelineEntry[];
};
