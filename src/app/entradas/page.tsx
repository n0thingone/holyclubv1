"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Loader2, Ticket } from "lucide-react";

type EventRow = {
  id: string;
  name: string | null;
  event_date: string | null;
  status: string | null;
  is_active: boolean | null;
  is_closed: boolean | null;
  created_at: string | null;
};

type TicketBatch = {
  id: string;
  event_id: string;
  stock: number | null;
  sold_count: number | null;
  active: boolean | null;
};

function hasStock(batch: TicketBatch) {
  if (!batch.active) return false;
  if (batch.stock === null || typeof batch.stock === "undefined") return true;
  return Number(batch.sold_count || 0) < Number(batch.stock || 0);
}

export default function EntradasPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [error, setError] = useState("");
  const [loadingText, setLoadingText] = useState("Buscando anticipadas activas...");

  useEffect(() => {
    let alive = true;

    async function loadActiveEvent() {
      setError("");
      setLoadingText("Buscando anticipadas activas...");

      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("id,name,event_date,status,is_active,is_closed,created_at")
        .or("is_active.eq.true,status.eq.active")
        .order("event_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (!alive) return;

      if (eventsError) {
        setError(eventsError.message || "No se pudieron cargar los eventos.");
        return;
      }

      const activeEvents = ((events || []) as EventRow[]).filter(
        (event) => !event.is_closed && (event.is_active === true || event.status === "active")
      );

      if (activeEvents.length === 0) {
        setError("No hay anticipadas disponibles en este momento.");
        return;
      }

      setLoadingText("Buscando tanda disponible...");

      for (const event of activeEvents) {
        const { data: batches, error: batchError } = await supabase
          .from("ticket_batches")
          .select("id,event_id,stock,sold_count,active")
          .eq("event_id", event.id)
          .eq("active", true)
          .order("batch_order", { ascending: true });

        if (!alive) return;

        if (batchError) {
          console.error("Error cargando tandas:", batchError);
          continue;
        }

        const availableBatch = ((batches || []) as TicketBatch[]).find(hasStock);

        if (availableBatch) {
          const currentParams = new URLSearchParams(window.location.search);
          const query = currentParams.toString();
          const suffix = query ? `?${query}` : "";

          router.replace(`/entradas/${event.id}${suffix}`);
          return;
        }
      }

      setError("No hay tandas de anticipadas con stock disponible.");
    }

    loadActiveEvent();

    return () => {
      alive = false;
    };
  }, [router, supabase]);

  return (
    <main className="min-h-screen overflow-hidden bg-black px-4 py-6 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(234,179,8,0.13),transparent_30%),radial-gradient(circle_at_bottom,rgba(0,177,234,0.08),transparent_34%)]" />

      <div className="relative mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
        <section className="w-full rounded-[2rem] border border-yellow-400/25 bg-zinc-950/95 p-7 text-center shadow-[0_0_70px_rgba(234,179,8,0.16)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-yellow-400 text-black shadow-[0_0_30px_rgba(250,204,21,0.30)]">
            {error ? <Ticket className="h-7 w-7" /> : <Loader2 className="h-7 w-7 animate-spin" />}
          </div>

          <p className="text-[11px] font-black uppercase tracking-[0.34em] text-yellow-300">
            HOLY CLUB
          </p>
          <h1 className="mt-2 text-2xl font-black uppercase leading-none text-white">
            Anticipadas oficiales
          </h1>

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
              {error}
            </div>
          ) : (
            <p className="mt-5 text-sm font-bold text-zinc-300">{loadingText}</p>
          )}
        </section>
      </div>
    </main>
  );
}
