"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Event } from "@/types";

export function useActiveEvent() {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  useEffect(() => {
    fetchActiveEvent();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("active-event")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => fetchActiveEvent()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchActiveEvent() {
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("status", "active")
      .single();

    setEvent(data);
    setLoading(false);
  }

  return { event, loading, refetch: fetchActiveEvent };
}
