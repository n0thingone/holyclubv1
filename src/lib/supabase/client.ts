import { createClient } from "@supabase/supabase-js";

let _client: ReturnType<typeof createClient> | undefined;

export function getSupabaseClient() {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    );
  }

  return _client;
}

export const createClientBrowser = getSupabaseClient;