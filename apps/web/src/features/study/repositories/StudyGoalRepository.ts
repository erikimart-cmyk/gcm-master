import { getSupabaseClient } from "@/features/auth/lib/supabase";

export type PersistedStudyGoal = {
  goalId: string;
};

const studyGoalUnavailableMessage =
  "A conexão com o progresso de estudo ainda não está configurada.";

function getClient() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error(studyGoalUnavailableMessage);
  }

  return supabase;
}

export async function loadStudyGoal(
  userId: string,
): Promise<PersistedStudyGoal | null> {
  const { data, error } = await getClient()
    .from("study_goals")
    .select("goal_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? { goalId: data.goal_id } : null;
}

export async function saveStudyGoal(userId: string, goalId: string): Promise<void> {
  const { error } = await getClient().from("study_goals").upsert(
    {
      user_id: userId,
      goal_id: goalId,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw error;
  }
}
