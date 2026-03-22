"use client";

import { useEffect, useState, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { RrppRanking } from "@/types";

export function useRanking(eventId?: string) {
  const [ranking, setRanking] = useState<RrppRanking[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = getSupabaseClient();

  const fetchRanking = useCallback(async () => {
    if (!eventId) return;

    const { data } = await supabase
      .from("rrpp_ranking")
      .select("*")
      .eq("event_id", eventId)
      .order("position", { ascending: true });

    setRanking((data as RrppRanking[]) || []);
    setLoading(false);
  }, [eventId, supabase]);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    fetchRanking();

    const channel = supabase
      .channel("ranking-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "checkins" },
        () => fetchRanking()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, fetchRanking, supabase]);

  return { ranking, loading, refetch: fetchRanking };
}