import { readEffectiveLearningEvidence } from "@/features/study/repositories/EffectiveEvidenceRepository";
import { composeEffectivePedagogicalReading } from "@/features/study/services/composeEffectivePedagogicalReading";
import type { EffectivePedagogicalReading } from "@/features/study/types/EffectiveEvidence";

export async function loadEffectivePedagogicalReading(): Promise<EffectivePedagogicalReading> {
  return composeEffectivePedagogicalReading(await readEffectiveLearningEvidence());
}
