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
          flowType: "pkce",
          storageKey: "holyclub-auth-v2",
        },
        global: {
          fetch: async (url, options = {}) => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);

            try {
              return await fetch(url, {
                ...options,
                signal: controller.signal,
              });
            } finally {
              clearTimeout(timeout);
            }
          },
        },
      }
    );
  }

  return _client;
}

export const createClientBrowser = getSupabaseClient;