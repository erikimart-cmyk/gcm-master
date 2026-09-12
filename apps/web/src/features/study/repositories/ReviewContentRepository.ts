import { getSupabaseClient } from "@/features/auth/lib/supabase";

export type ReviewContent = {
  id: string;
  subject: string;
  topic: string;
  title: string;
  learningObjective: string;
  explanation: string;
  workedExample: string;
  commonMistake: string | null;
};

type ReviewContentRow = {
  id: string;
  title: string;
  learning_objective: string;
  explanation: string;
  worked_example: string;
  common_mistake: string | null;
  topics: Array<{
    name: string;
    subjects: Array<{
      name: string;
    }>;
  }>;
};

const reviewContentUnavailableMessage =
  "A conexão com o conteúdo de revisão ainda não está configurada.";

function getClient() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error(reviewContentUnavailableMessage);
  }

  return supabase;
}

export async function loadPublishedReviewContents(): Promise<ReviewContent[]> {
  const { data, error } = await getClient()
    .from("review_contents")
    .select(
      "id, title, learning_objective, explanation, worked_example, common_mistake, topics(name, subjects(name))",
    )
    .eq("status", "published")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data as ReviewContentRow[]).map((content) => ({
    id: content.id,
    subject: content.topics[0]?.subjects[0]?.name ?? "Disciplina",
    topic: content.topics[0]?.name ?? "Tópico",
    title: content.title,
    learningObjective: content.learning_objective,
    explanation: content.explanation,
    workedExample: content.worked_example,
    commonMistake: content.common_mistake,
  }));
}

export async function recordReviewContentProgress(
  reviewContentId: string,
  completed: boolean,
): Promise<void> {
  const { error } = await getClient().rpc("record_review_content_progress", {
    p_review_content_id: reviewContentId,
    p_completed: completed,
  });

  if (error) {
    throw error;
  }
}
