import type { LearningEvidenceFact } from "@/features/study/types/LearningEvidenceFact";
import type {
  EffectiveEvidenceProvenance,
  EffectiveEvidenceRecord,
  MappedEffectiveEvidence,
} from "@/features/study/types/EffectiveEvidence";

export function mapEffectiveEvidenceRecord(
  record: EffectiveEvidenceRecord,
): MappedEffectiveEvidence {
  const fact: LearningEvidenceFact = {
    evidenceId: record.evidenceId,
    knowledgeUnitId: record.knowledgeUnitId,
    knowledgeUnitName: record.knowledgeUnitName,
    observation: record.observation,
    stage: record.stage,
    strength: record.strength,
    assistanceContext: record.assistanceContext,
    timingInterpretation: record.timingInterpretation,
    producerType: record.producerType,
    producerVersion: record.producerVersion,
    observedAt: record.observedAt,
    generatedAt: record.generatedAt,
  };

  const provenance: EffectiveEvidenceProvenance = {
    evidenceId: record.evidenceId,
    learningEventId: record.learningEventId,
    questionId: record.questionId,
    questionVersionId: record.questionVersionId,
    attemptId: record.attemptId,
  };

  return { fact, provenance };
}
