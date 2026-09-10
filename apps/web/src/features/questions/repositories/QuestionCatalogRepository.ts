import { getSupabaseClient } from "@/features/auth/lib/supabase";

import type { Question, QuestionAlternative, QuestionDifficulty } from "../types/Question";

const questionCatalogUnavailableMessage =
  "A conexão com o catálogo de questões ainda não está configurada.";

type AssignedQuestionRow = {
  id: number;
  country: string;
  language: string;
  bank_id: string;
  exam_name: string;
  position_name: string | null;
  subject: string;
  topic: string | null;
  difficulty: QuestionDifficulty;
  statement: string;
  alternatives: QuestionAlternative[];
  correct_answer: string;
  explanation: string;
};

export const limeiraGcmPilotExamId = "gcm-vunesp-pilot";

function getClient() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error(questionCatalogUnavailableMessage);
  }

  return supabase;
}

export async function assignNextQuestions(
  examId = limeiraGcmPilotExamId,
  limit = 5,
): Promise<Question[]> {
  const { data, error } = await getClient().rpc("assign_next_questions", {
    p_exam_id: examId,
    p_limit: limit,
  });

  if (error) {
    throw error;
  }

  return mapAssignedQuestions(data as AssignedQuestionRow[]);
}

export async function loadAssignedReviewQuestions(): Promise<Question[]> {
  const { data, error } = await getClient().rpc(
    "load_assigned_review_questions",
  );

  if (error) {
    throw error;
  }

  return mapAssignedQuestions(data as AssignedQuestionRow[]);
}

function mapAssignedQuestions(data: AssignedQuestionRow[]): Question[] {
  return data.map((question) => ({
    id: question.id,
    country: question.country,
    language: question.language,
    bankId: question.bank_id,
    exam: question.exam_name,
    position: question.position_name ?? undefined,
    subject: question.subject,
    topic: question.topic ?? undefined,
    difficulty: question.difficulty,
    statement: question.statement,
    alternatives: question.alternatives,
    correctAnswer: question.correct_answer,
    explanation: question.explanation,
  }));
}
