"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { RrppEventBenefit, RrppEventReward } from "@/types";

interface RrppStats {
  registered: number;
  checkedIn: number;
  position: number;
  benefits: RrppEventBenefit[];
  rewards: RrppEventReward[];
}

export function useRrppStats(rrppId?: string, eventId?: string) {
  const [stats, setStats] = useState<RrppStats>({
    registered: 0,
    checkedIn: 0,
    position: 0,
    benefits: [],
    rewards: [],
  });
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!rrppId || !eventId) {
      setLoading(false);
      return;
    }

    fetchStats();

    const channel = supabase
      .channel(`rrpp-stats-${rrppId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "checkins" },
        () => fetchStats()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
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
  }, [rrppId, eventId]);

  async function fetchStats() {
    if (!rrppId || !eventId) return;

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
          .single(),
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

    const registrations = registrationsRes.data || [];
    const checkedIn = registrations.filter(
      (r) => r.registration_status === "checked_in"
    ).length;

    setStats({
      registered: registrations.length,
      checkedIn: rankingRes.data?.checkin_count || checkedIn,
      position: rankingRes.data?.position || 0,
      benefits: (benefitsRes.data as RrppEventBenefit[]) || [],
      rewards: (rewardsRes.data as RrppEventReward[]) || [],
    });
    setLoading(false);
  }

  return { stats, loading, refetch: fetchStats };
}
