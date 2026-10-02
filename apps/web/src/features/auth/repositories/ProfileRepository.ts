import { getSupabaseClient } from "../lib/supabase";

const uniqueViolation = "23505";

const profileUnavailableMessage =
  "A conexão com o perfil ainda não está configurada.";

type ProfileInsert = {
  id: string;
};

const inFlight = new Map<string, Promise<void>>();

function getClient() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error(profileUnavailableMessage);
  }

  return supabase;
}

export async function guaranteeAuthenticatedProfile(
  userId: string | null,
): Promise<void> {
  if (!userId) {
    return;
  }

  await ensureOwnProfile(userId);
}

export function ensureOwnProfile(userId: string): Promise<void> {
  const existing = inFlight.get(userId);

  if (existing) {
    return existing;
  }

  const slot: { current: Promise<void> | null } = { current: null };
  const promise = writeOwnProfile(userId).finally(() => {
    if (inFlight.get(userId) === slot.current) {
      inFlight.delete(userId);
    }
  });

  slot.current = promise;
  inFlight.set(userId, promise);
  return promise;
}

async function writeOwnProfile(userId: string): Promise<void> {
  const supabase = getClient();
  const row: ProfileInsert = { id: userId };

  // ON CONFLICT DO NOTHING: a repeated or concurrent guarantee must not
  // update display_name, updated_at, or any other existing column.
  const { error } = await supabase.from("profiles").upsert(row, {
    onConflict: "id",
    ignoreDuplicates: true,
  });

  if (!error || error.code === uniqueViolation) {
    return;
  }

  const { data, error: readError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (!readError && data?.id === userId) {
    return;
  }

  throw error;
}
