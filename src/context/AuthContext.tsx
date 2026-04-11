// @ts-nocheck
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RealtimeChannel, Session, User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  email: string;
  username: string | null;
  role: string | null;
  holy_points_balance: number;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setLiveHolyPoints: (points: number) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const WELCOME_BONUS = 2500;
const WELCOME_BONUS_STORAGE_KEY = "holy_welcome_bonus_pending";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const pointsChannelRef = useRef<RealtimeChannel | null>(null);

  const cleanupPointsSubscription = useCallback(() => {
    if (pointsChannelRef.current) {
      void supabase.removeChannel(pointsChannelRef.current);
      pointsChannelRef.current = null;
    }
  }, [supabase]);

  const setLiveHolyPoints = useCallback((points: number) => {
    setProfile((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        holy_points_balance: Number(points) || 0,
      };
    });
  }, []);

  const ensureProfile = useCallback(
    async (authUser: User) => {
      const email = authUser.email ?? "";

      const fullName =
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        authUser.user_metadata?.given_name ||
        authUser.email?.split("@")[0] ||
        "Usuario";

      const { data: existingProfile, error: existingError } = await supabase
        .from("profiles")
        .select("id, role, holy_points_balance")
        .eq("id", authUser.id)
        .maybeSingle();

      if (existingError) {
        console.error("Error buscando profile existente:", existingError);
      }

      const isNewProfile = !existingProfile;

      if (isNewProfile) {
        const payload = {
          id: authUser.id,
          email,
          full_name: fullName,
          username: fullName,
          role: "cliente",
          holy_points_balance: WELCOME_BONUS,
        };

        const { error } = await (supabase as any).from("profiles").insert(payload);

        if (error) {
          console.error("Error ensureProfile insert code:", error?.code);
          console.error("Error ensureProfile insert message:", error?.message);
          console.error("Error ensureProfile insert details:", error?.details);
          console.error("Error ensureProfile insert hint:", error?.hint);
          return;
        }

        if (typeof window !== "undefined") {
          localStorage.setItem(
            WELCOME_BONUS_STORAGE_KEY,
            JSON.stringify({
              amount: WELCOME_BONUS,
              username: fullName,
              createdAt: new Date().toISOString(),
            })
          );
        }

        return;
      }

      const payload = {
        id: authUser.id,
        email,
        full_name: fullName,
        username: fullName,
        role: (existingProfile as { role?: string } | null)?.role ?? "cliente",
      };

     const { error } = await (supabase as any).from("profiles").upsert(payload, {
        onConflict: "id",
      });

      if (error) {
        console.error("Error ensureProfile upsert code:", error?.code);
        console.error("Error ensureProfile upsert message:", error?.message);
        console.error("Error ensureProfile upsert details:", error?.details);
        console.error("Error ensureProfile upsert hint:", error?.hint);
      }
    },
    [supabase]
  );

  const loadProfile = useCallback(
    async (userId: string) => {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id,email,username,role,holy_points_balance")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("Error loadProfile/profiles:", profileError);
        setProfile(null);
        return;
      }

      setProfile({
        id: profileData.id,
        email: profileData.email,
        username: profileData.username,
        role: profileData.role,
        holy_points_balance: Number(profileData.holy_points_balance ?? 0),
      });
    },
    [supabase]
  );

  const subscribeToHolyPoints = useCallback(
    (userId: string) => {
      cleanupPointsSubscription();

      const channel = supabase
        .channel(`holy-points-balance-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${userId}`,
          },
          async (payload) => {
            const nextPoints =
              payload.eventType === "DELETE"
                ? 0
                : Number(
                    (payload.new as { holy_points_balance?: number } | null)
                      ?.holy_points_balance ?? 0
                  );

            setLiveHolyPoints(nextPoints);
          }
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR") {
            console.error("Realtime profiles channel error");
          }
        });

      pointsChannelRef.current = channel;
    },
    [cleanupPointsSubscription, setLiveHolyPoints, supabase]
  );

  const syncUserProfile = useCallback(
    async (authUser: User) => {
      await ensureProfile(authUser);
      await loadProfile(authUser.id);
      subscribeToHolyPoints(authUser.id);
    },
    [ensureProfile, loadProfile, subscribeToHolyPoints]
  );

  const refreshProfile = useCallback(async () => {
    const {
      data: { user: currentUser },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("Error refreshProfile/getUser:", error);
      setProfile(null);
      cleanupPointsSubscription();
      return;
    }

    if (!currentUser) {
      setProfile(null);
      cleanupPointsSubscription();
      return;
    }

    await loadProfile(currentUser.id);
    subscribeToHolyPoints(currentUser.id);
  }, [cleanupPointsSubscription, loadProfile, subscribeToHolyPoints, supabase]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        setLoading(true);

        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getSession init:", error);
        }

        if (!mounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await syncUserProfile(currentSession.user);
        } else {
          cleanupPointsSubscription();
          setProfile(null);
        }
      } catch (err) {
        console.error("Auth init crash:", err);
        if (mounted) {
          cleanupPointsSubscription();
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (!currentSession?.user) {
        cleanupPointsSubscription();
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      setTimeout(() => {
        syncUserProfile(currentSession.user)
          .catch((err) => {
            console.error("Error syncUserProfile onAuthStateChange:", err);
          })
          .finally(() => {
            setLoading(false);
          });
      }, 0);
    });

    return () => {
      mounted = false;
      cleanupPointsSubscription();
      subscription.unsubscribe();
    };
  }, [cleanupPointsSubscription, supabase, syncUserProfile]);

  async function signOut() {
    try {
      setLoading(true);

      cleanupPointsSubscription();

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Error signOut:", error);
      }
    } catch (err) {
      console.error("signOut crash:", err);
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
    }
  }

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    signOut,
    refreshProfile,
    setLiveHolyPoints,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return ctx;
}