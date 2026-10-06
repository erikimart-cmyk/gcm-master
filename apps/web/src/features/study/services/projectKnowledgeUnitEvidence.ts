import type {
  KnowledgeUnitEvidenceProjection,
  KnowledgeUnitEvidenceTimelineEntry,
  LearningEvidenceFact,
} from "@/features/study/types/LearningEvidenceFact";

// Factual projection of loaded learning evidence.
// Authenticated clients cannot read evidence_actions, so invalidate/supersede
// is not applied here. strength, assistance and timing are copied, not weighed.
// A KnowledgeUnit with no loaded evidence is omitted. That absence is not a
// stored "unseen" state.

function compareFacts(left: LearningEvidenceFact, right: LearningEvidenceFact): number {
  const byObservedAt = left.observedAt.localeCompare(right.observedAt);
  if (byObservedAt !== 0) {
    return byObservedAt;
  }

  const byGeneratedAt = left.generatedAt.localeCompare(right.generatedAt);
  if (byGeneratedAt !== 0) {
    return byGeneratedAt;
  }

  return left.evidenceId.localeCompare(right.evidenceId);
}

function toTimelineEntry(fact: LearningEvidenceFact): KnowledgeUnitEvidenceTimelineEntry {
  return {
    evidenceId: fact.evidenceId,
    observation: fact.observation,
    observedAt: fact.observedAt,
    generatedAt: fact.generatedAt,
    stage: fact.stage,
    strength: fact.strength,
    assistanceContext: fact.assistanceContext,
    timingInterpretation: fact.timingInterpretation,
    producerType: fact.producerType,
    producerVersion: fact.producerVersion,
  };
}

export function projectKnowledgeUnitEvidence(
  facts: readonly LearningEvidenceFact[],
): KnowledgeUnitEvidenceProjection[] {
  const grouped = new Map<string, LearningEvidenceFact[]>();

  for (const fact of facts) {
    const current = grouped.get(fact.knowledgeUnitId);
    if (current) {
      current.push(fact);
    } else {
      grouped.set(fact.knowledgeUnitId, [fact]);
    }
  }

  return Array.from(grouped.entries())
    .sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
    .map(([knowledgeUnitId, group]) => {
      const timelineFacts = [...group].sort(compareFacts);
      const timeline = timelineFacts.map(toTimelineEntry);
      const first = timeline[0];
      const last = timeline[timeline.length - 1];
      const named = timelineFacts.find((fact) => fact.knowledgeUnitName !== null);

      return {
        knowledgeUnitId,
        knowledgeUnitName: named?.knowledgeUnitName ?? null,
        evidenceCount: timeline.length,
        successCount: timeline.filter((entry) => entry.observation === "success").length,
        difficultyCount: timeline.filter((entry) => entry.observation === "difficulty").length,
        observedCount: timeline.filter((entry) => entry.observation === "observed").length,
        firstObservedAt: first.observedAt,
        lastObservedAt: last.observedAt,
        latestObservation: last.observation,
        factualState: "observed",
        timeline,
      };
    });
}
