import type { EffectiveEvidenceReading, EffectivePedagogicalReading } from "@/features/study/types/EffectiveEvidence";
import { interpretKnowledgeUnitEvidence } from "@/features/study/services/interpretKnowledgeUnitEvidence";
import { mapEffectiveEvidenceRecord } from "@/features/study/services/mapEffectiveEvidenceFact";
import { projectKnowledgeUnitEvidence } from "@/features/study/services/projectKnowledgeUnitEvidence";

export function composeEffectivePedagogicalReading(
  reading: EffectiveEvidenceReading,
): EffectivePedagogicalReading {
  const mapped = reading.evidence.map(mapEffectiveEvidenceRecord);
  const interpretations = projectKnowledgeUnitEvidence(mapped.map((item) => item.fact)).flatMap(
    (projection) => interpretKnowledgeUnitEvidence(projection),
  );

  return {
    resolverVersion: reading.resolverVersion,
    actionsApplied: reading.actionsApplied,
    integrityStatus: reading.integrityStatus,
    unresolvedEvidenceIds: reading.unresolvedEvidenceIds,
    components: reading.components,
    provenance: mapped.map((item) => item.provenance),
    interpretations,
  };
}
