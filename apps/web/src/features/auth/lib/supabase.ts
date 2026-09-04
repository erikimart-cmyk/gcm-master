import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigurationMessage =
  "A autenticação ainda não foi configurada neste ambiente. Adicione as variáveis do Supabase para continuar.";

let client: SupabaseClient | null | undefined;

export function getSupabaseClient() {
  if (client !== undefined) {
    return client;
  }

  if (!supabaseUrl || !supabaseKey) {
    client = null;
    return client;
  }

  client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return client;
}
