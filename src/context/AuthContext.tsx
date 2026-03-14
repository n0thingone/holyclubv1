"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";

interface AuthContextValue {
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  profile: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    // StrictMode monta dos veces — solo inicializar una vez
    if (initialized.current) return;
    initialized.current = true;

    const supabase = getSupabaseClient();
    console.log("[AUTH_PROVIDER_INIT]");

    async function fetchProfile(email: string): Promise<Profile | null> {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email)
        .single();
      return data ?? null;
    }

    // Cargar sesión inicial
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log("[SESSION_LOADED]", session?.user?.email ?? "no session");
      if (session?.user?.email) {
        const p = await fetchProfile(session.user.email);
        setProfile(p);
      }
      setLoading(false);
    });

    // Una sola suscripción en toda la app
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AUTH_STATE_CHANGED]", event, session?.user?.email ?? "no user");

      if (event === "SIGNED_OUT") {
        setProfile(null);
        setLoading(false);
        return;
      }

      if (session?.user?.email) {
        const p = await fetchProfile(session.user.email);
        setProfile(p);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    const supabase = getSupabaseClient();
    console.log("[LOGOUT_SUCCESS]");
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <AuthContext.Provider value={{ profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
