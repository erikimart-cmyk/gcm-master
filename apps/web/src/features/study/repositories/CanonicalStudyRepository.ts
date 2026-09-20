import { getSupabaseClient } from "@/features/auth/lib/supabase";

import type {
  AnsweredQuestionResult,
  CanonicalAlternative,
  DeliveredQuestion,
  DeliveryOutcome,
  PresentationOutcome,
  ResponseOutcome,
} from "@/features/study/types/CanonicalStudy";

const catalogUnavailableMessage =
  "A conexão com o catálogo de questões ainda não está configurada.";

const DELIVERY_FORBIDDEN_KEYS = [
  "correct_answer",
  "correctAnswer",
  "explanation",
  "is_correct",
  "isCorrect",
  "p_correct",
  "pCorrect",
] as const;

export class CanonicalStudyTransportError extends Error {
  constructor(message = catalogUnavailableMessage) {
    super(message);
    this.name = "CanonicalStudyTransportError";
  }
}

function getClient() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new CanonicalStudyTransportError(catalogUnavailableMessage);
  }

  return supabase;
}

function firstRow(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) {
    const row = data[0];
    if (!row || typeof row !== "object") {
      return null;
    }
    return row as Record<string, unknown>;
  }

  if (data && typeof data === "object") {
    return data as Record<string, unknown>;
  }

  return null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNullableString(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  return undefined;
}

function mapAlternatives(value: unknown): CanonicalAlternative[] | null {
  if (!Array.isArray(value) || value.length < 2) {
    return null;
  }

  const alternatives: CanonicalAlternative[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const record = item as Record<string, unknown>;
    const id = asString(record.id);
    const text = asString(record.text);

    if (!id || text === null) {
      return null;
    }

    alternatives.push({ id, text });
  }

  return alternatives;
}

function assertNoForbiddenDeliveryKeys(row: Record<string, unknown>): boolean {
  return !DELIVERY_FORBIDDEN_KEYS.some((key) => key in row && row[key] != null);
}

function mapDeliveredQuestion(row: Record<string, unknown>): DeliveredQuestion | null {
  if (!assertNoForbiddenDeliveryKeys(row)) {
    return null;
  }

  const assignmentId = asString(row.assignment_id ?? row.assignmentId);
  const questionVersionId = asString(
    row.question_version_id ?? row.questionVersionId,
  );
  const questionIdRaw = row.question_id ?? row.questionId;
  const questionId =
    typeof questionIdRaw === "number"
      ? questionIdRaw
      : typeof questionIdRaw === "string" && questionIdRaw.length > 0
        ? Number(questionIdRaw)
        : NaN;
  const statement = asString(row.statement);
  const alternatives = mapAlternatives(row.alternatives);
  const difficulty = asString(row.difficulty);
  const subjectLabel = asString(row.subject_label ?? row.subjectLabel);
  const topicLabel = asString(row.topic_label ?? row.topicLabel);
  const presentationContext = asString(
    row.presentation_context ?? row.presentationContext,
  );

  if (
    !assignmentId ||
    !questionVersionId ||
    !Number.isFinite(questionId) ||
    !statement ||
    !alternatives ||
    !difficulty ||
    !subjectLabel ||
    !topicLabel ||
    !presentationContext
  ) {
    return null;
  }

  return {
    assignmentId,
    questionVersionId,
    questionId,
    statement,
    alternatives,
    difficulty,
    subjectLabel,
    topicLabel,
    presentationContext,
  };
}

async function invokeRpc(name: string, args: Record<string, unknown>) {
  try {
    const { data, error } = await getClient().rpc(name, args);

    if (error) {
      throw new CanonicalStudyTransportError(error.message);
    }

    return firstRow(data);
  } catch (error) {
    if (error instanceof CanonicalStudyTransportError) {
      throw error;
    }

    throw new CanonicalStudyTransportError(
      error instanceof Error ? error.message : catalogUnavailableMessage,
    );
  }
}

export async function requestStudyQuestion(): Promise<DeliveryOutcome> {
  const row = await invokeRpc("request_question_delivery", {
    p_delivery_context: "study",
  });

  const outcome = asString(row?.outcome);

  if (outcome === "UNAVAILABLE") {
    return { kind: "UNAVAILABLE" };
  }

  if (outcome === "CONTEXT_NOT_READY") {
    return { kind: "CONTEXT_NOT_READY" };
  }

  if (outcome === "DENIED") {
    return { kind: "DENIED" };
  }

  if (outcome !== "DELIVERED" || !row) {
    throw new CanonicalStudyTransportError(
      "A entrega da questão retornou um resultado incompleto.",
    );
  }

  const question = mapDeliveredQuestion(row);

  if (!question) {
    return { kind: "UNAVAILABLE" };
  }

  return { kind: "DELIVERED", question };
}

export async function confirmPresentation(
  assignmentId: string,
): Promise<PresentationOutcome> {
  const row = await invokeRpc("confirm_question_presentation", {
    p_assignment_id: assignmentId,
  });

  const outcome = asString(row?.outcome);

  if (outcome === "UNAVAILABLE") {
    return { kind: "UNAVAILABLE" };
  }

  if (outcome === "CONTEXT_NOT_READY") {
    return { kind: "CONTEXT_NOT_READY" };
  }

  if (outcome === "DENIED") {
    return { kind: "DENIED" };
  }

  if (outcome !== "CONFIRMED" || !row) {
    throw new CanonicalStudyTransportError(
      "A confirmação de apresentação retornou um resultado incompleto.",
    );
  }

  const confirmedAssignmentId = asString(row.assignment_id ?? row.assignmentId);

  if (confirmedAssignmentId !== assignmentId) {
    throw new CanonicalStudyTransportError(
      "A confirmação de apresentação não correspondeu à questão exibida.",
    );
  }

  const presentedAtValue = row.presented_at ?? row.presentedAt;
  const presentedAt =
    presentedAtValue instanceof Date
      ? presentedAtValue.toISOString()
      : typeof presentedAtValue === "string"
        ? presentedAtValue
        : null;

  return {
    kind: "CONFIRMED",
    assignmentId: confirmedAssignmentId,
    presentedAt,
  };
}

export async function submitResponse(
  assignmentId: string,
  selectedAnswer: string,
  submissionId: string,
): Promise<ResponseOutcome> {
  const row = await invokeRpc("submit_question_response", {
    p_assignment_id: assignmentId,
    p_selected_answer: selectedAnswer,
    p_submission_id: submissionId,
  });

  const outcome = asString(row?.outcome);

  if (outcome === "CONFLICT") {
    return { kind: "CONFLICT" };
  }

  if (outcome === "UNAVAILABLE") {
    return { kind: "UNAVAILABLE" };
  }

  if (outcome === "DENIED") {
    return { kind: "DENIED" };
  }

  if (outcome !== "RECORDED" || !row) {
    throw new CanonicalStudyTransportError(
      "O registro da resposta retornou um resultado incompleto.",
    );
  }

  const resultAssignmentId = asString(row.assignment_id ?? row.assignmentId);
  const attemptId = asString(row.attempt_id ?? row.attemptId);
  const recordedSelected = asString(row.selected_answer ?? row.selectedAnswer);
  const isCorrectRaw = row.is_correct ?? row.isCorrect;

  if (
    resultAssignmentId !== assignmentId ||
    !attemptId ||
    recordedSelected !== selectedAnswer ||
    typeof isCorrectRaw !== "boolean"
  ) {
    throw new CanonicalStudyTransportError(
      "O registro da resposta retornou um resultado incompleto.",
    );
  }

  const result: AnsweredQuestionResult = {
    assignmentId: resultAssignmentId,
    attemptId,
    selectedAnswer: recordedSelected,
    isCorrect: isCorrectRaw,
    correctAnswer: asNullableString(row.correct_answer ?? row.correctAnswer) ?? null,
    explanation: asNullableString(row.explanation) ?? null,
  };

  return { kind: "RECORDED", result };
}

export type CanonicalStudyClient = {
  requestStudyQuestion: typeof requestStudyQuestion;
  confirmPresentation: typeof confirmPresentation;
  submitResponse: typeof submitResponse;
};

export const canonicalStudyClient: CanonicalStudyClient = {
  requestStudyQuestion,
  confirmPresentation,
  submitResponse,
};
