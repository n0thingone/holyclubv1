"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { RrppEventBenefit, RrppEventReward } from "@/types";

interface RrppStats {
  registered: number;
  checkedIn: number;
  position: number;
  benefits: RrppEventBenefit[];
  rewards: RrppEventReward[];
}

// 👇 TIPOS AGREGADOS (CLAVE)
type Registration = {
  id: string;
  registration_status: string;
};

type Ranking = {
  position: number;
  checkin_count: number;
};

export function useRrppStats(rrppId?: string, eventId?: string) {
  const [stats, setStats] = useState<RrppStats>({
    registered: 0,
    checkedIn: 0,
    position: 0,
    benefits: [],
    rewards: [],
  });
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => getSupabaseClient(), []);

  const fetchStats = useCallback(async () => {
    if (!rrppId || !eventId) {
      setStats({
        registered: 0,
        checkedIn: 0,
        position: 0,
        benefits: [],
        rewards: [],
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [registrationsRes, rankingRes, benefitsRes, rewardsRes] =
        await Promise.all([
          supabase
            .from("guest_registrations")
            .select("id, registration_status")
            .eq("rrpp_id", rrppId)
            .eq("event_id", eventId),

          supabase
            .from("rrpp_ranking")
            .select("position, checkin_count")
            .eq("rrpp_id", rrppId)
            .eq("event_id", eventId)
            .maybeSingle(),

          supabase
            .from("rrpp_event_benefits")
            .select("*")
            .eq("rrpp_id", rrppId)
            .eq("event_id", eventId),

          supabase
            .from("rrpp_event_rewards")
            .select("*")
            .eq("rrpp_id", rrppId)
            .eq("event_id", eventId),
        ]);

      if (registrationsRes.error) throw registrationsRes.error;
      if (rankingRes.error) throw rankingRes.error;
      if (benefitsRes.error) throw benefitsRes.error;
      if (rewardsRes.error) throw rewardsRes.error;

      // ✅ FIX 1: tipado registrations
      const registrations = (registrationsRes.data ?? []) as Registration[];

      const checkedInFromRegistrations = registrations.filter(
        (r) => r.registration_status === "checked_in"
      ).length;

      // ✅ FIX 2: tipado ranking
      const ranking = rankingRes.data as Ranking | null;

      setStats({
        registered: registrations.length,
        checkedIn:
          ranking?.checkin_count ?? checkedInFromRegistrations ?? 0,
        position: ranking?.position ?? 0,
        benefits: (benefitsRes.data as RrppEventBenefit[]) || [],
        rewards: (rewardsRes.data as RrppEventReward[]) || [],
      });
    } catch (error) {
      console.error("Error cargando stats RRPP:", error);
      setStats({
        registered: 0,
        checkedIn: 0,
        position: 0,
        benefits: [],
        rewards: [],
      });
    } finally {
      setLoading(false);
    }
  }, [rrppId, eventId, supabase]);

  useEffect(() => {
    fetchStats();

    if (!rrppId || !eventId) return;

    const channel = supabase
      .channel(`rrpp-stats-${rrppId}-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "guest_registrations",
          filter: `rrpp_id=eq.${rrppId}`,
        },
        () => fetchStats()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "checkins",
        },
        () => fetchStats()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rrpp_ranking",
          filter: `rrpp_id=eq.${rrppId}`,
        },
        () => fetchStats()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rrpp_event_benefits",
          filter: `rrpp_id=eq.${rrppId}`,
        },
        () => fetchStats()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rrpp_event_rewards",
          filter: `rrpp_id=eq.${rrppId}`,
        },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rrppId, eventId, supabase, fetchStats]);

  return { stats, loading, refetch: fetchStats };
}