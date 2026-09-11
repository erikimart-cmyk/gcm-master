import { getSupabaseClient } from "@/features/auth/lib/supabase";

export type PersistedStudyTrack = {
  examId: string;
  title: string;
  organizingBody: string;
  positionName: string | null;
};

function getClient() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("A conexão com sua trilha de estudos ainda não está configurada.");
  }

  return supabase;
}

export async function loadStudyTrack(userId: string): Promise<PersistedStudyTrack | null> {
  const { data, error } = await getClient()
    .from("user_study_tracks")
    .select("exam_id, exams(name, organizing_body, position_name)")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const exam = data?.exams?.[0];

  return data && exam
    ? {
        examId: data.exam_id,
        title: exam.name,
        organizingBody: exam.organizing_body,
        positionName: exam.position_name,
      }
    : null;
}

export async function saveStudyTrack(userId: string, examId: string): Promise<void> {
  const { error } = await getClient().from("user_study_tracks").upsert(
    { user_id: userId, exam_id: examId },
    { onConflict: "user_id" },
  );

  if (error) {
    throw error;
  }
}
