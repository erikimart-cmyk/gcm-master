import { getSupabaseClient } from "@/features/auth/lib/supabase";

export type PersistedQuestionResult = {
  questionId: number;
  subject: string;
  topic?: string;
  correct: boolean;
  answeredAt: string;
  attempt: number;
  isReview: boolean;
};

type QuestionAttemptInput = {
  questionId: number;
  subject: string;
  topic?: string;
  correct: boolean;
  isReview: boolean;
};

const progressUnavailableMessage =
  "A conexão com o progresso de estudo ainda não está configurada.";

function getClient() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error(progressUnavailableMessage);
  }

  return supabase;
}

export async function loadQuestionAttempts(
  userId: string,
): Promise<PersistedQuestionResult[]> {
  const { data, error } = await getClient()
    .from("question_attempts")
    .select("question_id, subject, topic, correct, answered_at, attempt_number, is_review")
    .eq("user_id", userId)
    .order("answered_at", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data.map((attempt) => ({
    questionId: attempt.question_id,
    subject: attempt.subject,
    topic: attempt.topic ?? undefined,
    correct: attempt.correct,
    answeredAt: attempt.answered_at,
    attempt: attempt.attempt_number,
    isReview: attempt.is_review,
  }));
}

export async function saveQuestionAttempt(
  input: QuestionAttemptInput,
): Promise<PersistedQuestionResult> {
  const { data, error } = input.topic
    ? await getClient().rpc("record_assigned_question_attempt", {
        p_question_id: input.questionId,
        p_correct: input.correct,
        p_is_review: input.isReview,
      })
    : await getClient().rpc("record_question_attempt", {
        p_question_id: input.questionId,
        p_subject: input.subject,
        p_correct: input.correct,
        p_is_review: input.isReview,
      });

  if (error) {
    throw error;
  }

  const attempt = data?.[0];

  if (!attempt) {
    throw new Error("O registro da tentativa não retornou um resultado.");
  }

  return {
    questionId: attempt.question_id,
    subject: attempt.subject,
    topic: attempt.topic ?? undefined,
    correct: attempt.correct,
    answeredAt: attempt.answered_at,
    attempt: attempt.attempt_number,
    isReview: attempt.is_review,
  };
}
