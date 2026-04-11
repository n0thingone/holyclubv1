import { createClient } from "@supabase/supabase-js";

let _client: ReturnType<typeof createClient> | undefined;

export function getSupabaseClient() {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}

export const createClientBrowser = getSupabaseClient;