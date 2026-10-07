import { getSupabaseClient } from "@/features/auth/lib/supabase";

import {
  EFFECTIVE_COMPONENT_STATUSES,
  EFFECTIVE_EVIDENCE_RESOLVER_VERSION,
} from "@/features/study/types/EffectiveEvidence";
import type {
  EffectiveComponentStatus,
  EffectiveEvidenceReading,
  EffectiveEvidenceRecord,
  EffectiveIntegrityStatus,
} from "@/features/study/types/EffectiveEvidence";
import type {
  LearningEvidenceObservation,
  LearningEvidenceStrength,
} from "@/features/study/types/LearningEvidenceFact";

const evidenceUnavailableMessage =
  "A conexão com a leitura efetiva de evidências ainda não está configurada.";

const incompleteEvidenceMessage = "A leitura efetiva de evidências veio incompleta.";

const inconsistentEvidenceMessage = "A leitura efetiva de evidências veio inconsistente.";

function getClient() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error(evidenceUnavailableMessage);
  }

  return supabase;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNullableString(value: unknown): string | null | undefined {
  if (value === null) {
    return null;
  }

  return asString(value) ?? undefined;
}

function asObservation(value: unknown): LearningEvidenceObservation | null {
  if (value === "observed" || value === "success" || value === "difficulty") {
    return value;
  }

  return null;
}

function asStrength(value: unknown): LearningEvidenceStrength | null {
  if (value === "weak" || value === "moderate" || value === "strong") {
    return value;
  }

  return null;
}

function asQuestionId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && /^[1-9]\d*$/.test(value)) {
    return Number(value);
  }

  return null;
}

function asComponentStatus(value: unknown): EffectiveComponentStatus | null {
  if (
    typeof value === "string" &&
    (EFFECTIVE_COMPONENT_STATUSES as readonly string[]).includes(value)
  ) {
    return value as EffectiveComponentStatus;
  }

  return null;
}

function asStringList(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) {
    return null;
  }

  return value;
}

function readEvidence(value: unknown): EffectiveEvidenceRecord | null {
  const row = asRecord(value);
  if (!row) {
    return null;
  }

  const evidenceId = asString(row.evidence_id);
  const learningEventId = asString(row.learning_event_id);
  const questionId = asQuestionId(row.question_id);
  const questionVersionId = asString(row.question_version_id);
  const attemptId = asString(row.attempt_id);
  const knowledgeUnitId = asString(row.knowledge_unit_id);
  const knowledgeUnitName = asNullableString(row.knowledge_unit_name);
  const stage = asString(row.stage);
  const observation = asObservation(row.observation);
  const observedAt = asString(row.observed_at);
  const generatedAt = asString(row.generated_at);
  const strength = asStrength(row.strength);
  const assistanceContext = asString(row.assistance_context);
  const timingInterpretation = asString(row.timing_interpretation);
  const producerType = asString(row.producer_type);
  const producerVersion = asString(row.producer_version);

  if (
    !evidenceId ||
    !learningEventId ||
    questionId === null ||
    !questionVersionId ||
    !attemptId ||
    !knowledgeUnitId ||
    knowledgeUnitName === undefined ||
    !stage ||
    !observation ||
    !observedAt ||
    !generatedAt ||
    !strength ||
    !assistanceContext ||
    !timingInterpretation ||
    !producerType ||
    !producerVersion
  ) {
    return null;
  }

  return {
    evidenceId,
    learningEventId,
    questionId,
    questionVersionId,
    attemptId,
    knowledgeUnitId,
    knowledgeUnitName,
    stage,
    observation,
    observedAt,
    generatedAt,
    strength,
    assistanceContext,
    timingInterpretation,
    producerType,
    producerVersion,
  };
}

export function parseEffectiveEvidenceWire(value: unknown): EffectiveEvidenceReading {
  const payload = asRecord(value);
  if (!payload) {
    throw new Error(incompleteEvidenceMessage);
  }

  if (payload.resolver_version !== EFFECTIVE_EVIDENCE_RESOLVER_VERSION) {
    throw new Error(inconsistentEvidenceMessage);
  }

  if (payload.actions_applied !== true) {
    throw new Error(inconsistentEvidenceMessage);
  }

  const integrityStatus = payload.integrity_status;
  if (integrityStatus !== "ok" && integrityStatus !== "degraded") {
    throw new Error(inconsistentEvidenceMessage);
  }

  const unresolvedEvidenceIds = asStringList(payload.unresolved_evidence_ids);
  const evidenceInput = payload.evidence;
  const componentInput = payload.components;

  if (!unresolvedEvidenceIds || !Array.isArray(evidenceInput) || !Array.isArray(componentInput)) {
    throw new Error(incompleteEvidenceMessage);
  }

  const evidence: EffectiveEvidenceRecord[] = [];
  for (const item of evidenceInput) {
    const record = readEvidence(item);
    if (!record) {
      throw new Error(incompleteEvidenceMessage);
    }
    evidence.push(record);
  }

  const components: EffectiveEvidenceReading["components"][number][] = [];
  const componentIds = new Set<string>();

  for (const item of componentInput) {
    const row = asRecord(item);
    const evidenceIds = row ? asStringList(row.evidence_ids) : null;
    const status = row ? asComponentStatus(row.status) : null;
    if (!evidenceIds || evidenceIds.length === 0 || !status) {
      throw new Error(incompleteEvidenceMessage);
    }

    for (const evidenceId of evidenceIds) {
      componentIds.add(evidenceId);
    }

    components.push({ evidenceIds, status });
  }

  const unresolvedSet = new Set(unresolvedEvidenceIds);
  const sameUnresolved =
    unresolvedSet.size === unresolvedEvidenceIds.length &&
    unresolvedSet.size === componentIds.size &&
    unresolvedEvidenceIds.every((evidenceId) => componentIds.has(evidenceId));

  if (!sameUnresolved) {
    throw new Error(inconsistentEvidenceMessage);
  }

  if (integrityStatus === "ok" && (unresolvedEvidenceIds.length > 0 || components.length > 0)) {
    throw new Error(inconsistentEvidenceMessage);
  }

  if (integrityStatus === "degraded" && unresolvedEvidenceIds.length === 0) {
    throw new Error(inconsistentEvidenceMessage);
  }

  const readingIntegrity: EffectiveIntegrityStatus = integrityStatus;

  return {
    resolverVersion: EFFECTIVE_EVIDENCE_RESOLVER_VERSION,
    actionsApplied: true,
    integrityStatus: readingIntegrity,
    unresolvedEvidenceIds,
    components,
    evidence,
  };
}

export async function readEffectiveLearningEvidence(): Promise<EffectiveEvidenceReading> {
  const { data, error } = await getClient().rpc("read_effective_learning_evidence");

  if (error) {
    throw error;
  }

  return parseEffectiveEvidenceWire(data);
}
