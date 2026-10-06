import { getSupabaseClient } from "@/features/auth/lib/supabase";

import type {
  LearningEvidenceFact,
  LearningEvidenceObservation,
  LearningEvidenceStrength,
} from "@/features/study/types/LearningEvidenceFact";

const evidenceUnavailableMessage =
  "A conexão com as evidências de estudo ainda não está configurada.";

const evidenceSelect =
  "id, knowledge_unit_id, observation, stage, strength, assistance_context, timing_interpretation, producer_type, producer_version, observed_at, generated_at, knowledge_units(name)";

function getClient() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error(evidenceUnavailableMessage);
  }

  return supabase;
}

function readKnowledgeUnitName(value: unknown): string | null {
  const record = Array.isArray(value) ? value[0] : value;
  if (!record || typeof record !== "object") {
    return null;
  }

  const name = (record as { name?: unknown }).name;
  return typeof name === "string" && name.length > 0 ? name : null;
}

function asObservation(value: unknown): LearningEvidenceObservation {
  if (value === "observed" || value === "success" || value === "difficulty") {
    return value;
  }

  throw new Error("A evidência retornou uma observation desconhecida.");
}

function asStrength(value: unknown): LearningEvidenceStrength {
  if (value === "weak" || value === "moderate" || value === "strong") {
    return value;
  }

  throw new Error("A evidência retornou uma strength desconhecida.");
}

function asString(value: unknown, label: string): string {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  throw new Error(`A evidência retornou ${label} incompleto.`);
}

// Reads the signed-in student's learning_evidence.
// evidence_actions stay unread: authenticated has no select grant on that table.
// This function does not classify, score, or choose a next question.
export async function loadLearningEvidence(profileId: string): Promise<LearningEvidenceFact[]> {
  const { data, error } = await getClient()
    .from("learning_evidence")
    .select(evidenceSelect)
    .eq("profile_id", profileId)
    .order("observed_at", { ascending: true })
    .order("generated_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    evidenceId: asString(row.id, "id"),
    knowledgeUnitId: asString(row.knowledge_unit_id, "knowledge_unit_id"),
    knowledgeUnitName: readKnowledgeUnitName(row.knowledge_units),
    observation: asObservation(row.observation),
    stage: asString(row.stage, "stage"),
    strength: asStrength(row.strength),
    assistanceContext: asString(row.assistance_context, "assistance_context"),
    timingInterpretation: asString(row.timing_interpretation, "timing_interpretation"),
    producerType: asString(row.producer_type, "producer_type"),
    producerVersion: asString(row.producer_version, "producer_version"),
    observedAt: asString(row.observed_at, "observed_at"),
    generatedAt: asString(row.generated_at, "generated_at"),
  }));
}
