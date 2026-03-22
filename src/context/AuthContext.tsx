"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
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
  const mountedRef = useRef(false);

  const loadProfile = useCallback(async (email?: string | null) => {
    const supabase = getSupabaseClient();

    try {
      if (!email) {
        if (mountedRef.current) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (error) {
        console.error("[PROFILE_LOAD_ERROR]", error);
        if (mountedRef.current) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      if (mountedRef.current) {
        setProfile(data ?? null);
        setLoading(false);
      }
    } catch (err) {
      console.error("[PROFILE_LOAD_UNEXPECTED_ERROR]", err);
      if (mountedRef.current) {
        setProfile(null);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    mountedRef.current = true;

    const loadSession = async () => {
      try {
        setLoading(true);

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("[SESSION_LOAD_ERROR]", error);
          if (mountedRef.current) {
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        await loadProfile(session?.user?.email ?? null);
      } catch (err) {
        console.error("[SESSION_LOAD_UNEXPECTED_ERROR]", err);
        if (mountedRef.current) {
          setProfile(null);
          setLoading(false);
        }
      }
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mountedRef.current) return;
      void loadProfile(session?.user?.email ?? null);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  async function signOut() {
    const supabase = getSupabaseClient();

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("[SIGNOUT_ERROR]", err);
    } finally {
      setProfile(null);
      setLoading(false);
      window.location.href = "/login";
    }
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