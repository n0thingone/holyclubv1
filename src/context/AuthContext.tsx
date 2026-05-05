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

  // IMPORTANTE:
  // Dejamos este nombre para no romper DashboardShell/Home/MysteryBox,
  // pero desde ahora este valor viene de public.holy_points.points.
  // profiles.holy_points_balance queda legacy.
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

  async function ensureHolyPointsRow(userId: string, initialPoints = 0) {
    const { data: existingPoints, error: pointsReadError } = await supabase
      .from("holy_points")
      .select("user_id, points")
      .eq("user_id", userId)
      .maybeSingle();

    if (pointsReadError) {
      console.error("Error leyendo holy_points:", pointsReadError);
      return;
    }

    if (!existingPoints) {
      const { error: insertPointsError } = await (supabase as any)
        .from("holy_points")
        .insert({
          user_id: userId,
          points: Number(initialPoints) || 0,
          reason: initialPoints > 0 ? "Welcome bonus" : "Init balance",
          created_at: new Date().toISOString(),
        });

      if (insertPointsError) {
        console.error("Error creando holy_points:", insertPointsError);
      }
    }
  }

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
        .select("id, role")
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

          // LEGACY: lo mantenemos sincronizado para no romper vistas viejas,
          // pero el saldo real es holy_points.points.
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

        await ensureHolyPointsRow(authUser.id, WELCOME_BONUS);

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

      await ensureHolyPointsRow(authUser.id, 0);
    },
    [supabase]
  );

  const loadProfile = useCallback(
    async (userId: string) => {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id,email,username,role")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("Error loadProfile/profiles:", profileError);
        setProfile(null);
        return;
      }

      const { data: pointsData, error: pointsError } = await supabase
        .from("holy_points")
        .select("points")
        .eq("user_id", userId)
        .maybeSingle();

      if (pointsError) {
        console.error("Error loadProfile/holy_points:", pointsError);
      }

      const canonicalPoints = Number(pointsData?.points ?? 0);

      setProfile({
        id: profileData.id,
        email: profileData.email,
        username: profileData.username,
        role: profileData.role,
        holy_points_balance: canonicalPoints,
      });
    },
    [supabase]
  );

  const subscribeToHolyPoints = useCallback(
    (userId: string) => {
      cleanupPointsSubscription();

      const channel = supabase
        .channel(`holy-points-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "holy_points",
            filter: `user_id=eq.${userId}`,
          },
          async (payload) => {
            const nextPoints =
              payload.eventType === "DELETE"
                ? 0
                : Number((payload.new as { points?: number } | null)?.points ?? 0);

            setLiveHolyPoints(nextPoints);

            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("holy-credits-updated", {
                  detail: nextPoints,
                })
              );
            }
          }
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR") {
            console.error("Realtime holy_points channel error");
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
