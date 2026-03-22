"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Event } from "@/types";

export function useActiveEvent() {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = getSupabaseClient();
  const mountedRef = useRef(false);
  const fetchingRef = useRef(false);

  const fetchActiveEvent = useCallback(async () => {
    if (fetchingRef.current) return;

    fetchingRef.current = true;

    try {
      if (mountedRef.current) {
        setLoading(true);
      }

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("useActiveEvent error:", error);

        if (mountedRef.current) {
          setEvent(null);
        }
        return;
      }

      if (mountedRef.current) {
        setEvent((data as Event | null) ?? null);
      }
    } catch (err) {
      console.error("useActiveEvent unexpected error:", err);

      if (mountedRef.current) {
        setEvent(null);
      }
    } finally {
      fetchingRef.current = false;

      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [supabase]);

  useEffect(() => {
    mountedRef.current = true;

    void fetchActiveEvent();

    const channel = supabase
      .channel("active-event")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => {
          void fetchActiveEvent();
        }
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      void supabase.removeChannel(channel);
    };
  }, [fetchActiveEvent, supabase]);

  return {
    event,
    loading,
    refreshEvent: fetchActiveEvent,
    refetch: fetchActiveEvent,
  };
}