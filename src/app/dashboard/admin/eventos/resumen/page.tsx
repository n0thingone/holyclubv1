"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import DashboardShell from "@/components/navigation/DashboardShell";
import { getSupabaseClient } from "@/lib/supabase/client";
import { toPng } from "html-to-image";
import {
  RefreshCw,
  Download,
  Copy,
  CalendarDays,
  Clock3,
  Sparkles,
  Trophy,
  Ticket,
  Gift,
  ShieldAlert,
  Coins,
} from "lucide-react";

type EventRow = Record<string, any>;

export default function AdminResumenEventoPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [eventData, setEventData] = useState<EventRow | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const cardRef = useRef<HTMLDivElement | null>(null);

  const pickNumber = useCallback((obj: Record<string, any>, keys: string[]) => {
    for (const key of keys) {
      const value = obj?.[key];
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
        return Number(value);
      }
    }
    return 0;
  }, []);

  const pickString = useCallback((obj: Record<string, any>, keys: string[]) => {
    for (const key of keys) {
      const value = obj?.[key];
      if (typeof value === "string" && value.trim()) return value;
    }
    return "";
  }, []);

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "Sin fecha";
    try {
      return new Date(`${date}T00:00:00`).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return date;
    }
  };

  const formatDateTime = (date: string | null | undefined) => {
    if (!date) return "—";
    try {
      return new Date(date).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return date;
    }
  };

  const formatTime = (time: string | null | undefined) => {
    if (!time) return "--:--";
    return String(time).slice(0, 5);
  };

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      if (eventId) {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("id", eventId)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          setErrorMessage("No encontré el evento pedido.");
          setEventData(null);
          setLoading(false);
          return;
        }

        setEventData(data);
        setLoading(false);
        return;
      }

      const { data: closedEvents, error: closedError } = await supabase
        .from("events")
        .select("*")
        .or("status.eq.closed,is_closed.eq.true")
        .order("closed_at", { ascending: false, nullsFirst: false })
        .limit(1);

      if (closedError) throw closedError;

      if (closedEvents && closedEvents.length > 0) {
        setEventData(closedEvents[0]);
        setInfoMessage("Mostrando el último evento cerrado.");
        setLoading(false);
        return;
      }

      const { data: activeEvents, error: activeError } = await supabase
        .from("events")
        .select("*")
        .or("status.eq.active,is_active.eq.true")
        .order("created_at", { ascending: false })
        .limit(1);

      if (activeError) throw activeError;

      if (activeEvents && activeEvents.length > 0) {
        setEventData(activeEvents[0]);
        setInfoMessage("No había evento cerrado. Te muestro el activo.");
        setLoading(false);
        return;
      }

      const { data: recentEvents, error: recentError } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);

      if (recentError) throw recentError;

      if (recentEvents && recentEvents.length > 0) {
        setEventData(recentEvents[0]);
        setInfoMessage("No había evento cerrado ni activo. Te muestro el más reciente.");
        setLoading(false);
        return;
      }

      setEventData(null);
      setErrorMessage("Todavía no hay eventos para resumir.");
      setLoading(false);
    } catch (err: any) {
      setErrorMessage(err?.message || "No se pudo cargar el resumen del evento.");
      setEventData(null);
      setLoading(false);
    }
  }, [eventId, supabase]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const statusLabel = useMemo(() => {
    if (!eventData) return "Sin evento";
    if (eventData.status === "closed" || eventData.is_closed) return "Cerrado";
    if (eventData.status === "active" || eventData.is_active) return "Activo";
    return "Inactivo";
  }, [eventData]);

  const metrics = useMemo(() => {
    const row = eventData || {};

    return {
      totalIngresos: pickNumber(row, [
        "total_ingresos",
        "total_entries",
        "total_checkins",
        "entries_count",
        "checkins_count",
        "total_scans_valid",
      ]),
      totalGold: pickNumber(row, [
        "total_gold",
        "gold_count",
        "gold_used",
        "qr_gold_used",
      ]),
      totalCanjes: pickNumber(row, [
        "total_canjes",
        "redemptions_count",
        "total_redemptions",
        "benefits_used",
      ]),
      totalInvalidos: pickNumber(row, [
        "total_invalidos",
        "invalid_count",
        "rejected_count",
        "invalid_scans",
      ]),
      totalPuntos: pickNumber(row, [
        "total_puntos",
        "points_given",
        "points_awarded",
      ]),
      totalFree: pickNumber(row, [
        "total_free",
        "free_count",
        "free_entries",
      ]),
      topRrpp: pickString(row, [
        "top_rrpp_name",
        "best_rrpp_name",
        "rrpp_top_name",
      ]),
    };
  }, [eventData, pickNumber, pickString]);

  async function handleExportImage() {
    if (!cardRef.current || !eventData) return;

    try {
      setExporting(true);

      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });

      const link = document.createElement("a");
      const eventName = String(eventData?.name || "evento").replace(/\s+/g, "-").toLowerCase();
      link.download = `resumen-${eventName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      setErrorMessage("No pude generar la imagen del resumen.");
    } finally {
      setExporting(false);
    }
  }

  async function handleCopySummary() {
    if (!eventData) return;

    const text = [
      `Resumen evento: ${eventData?.name || "Sin nombre"}`,
      `Estado: ${statusLabel}`,
      `Fecha: ${formatDate(eventData?.event_date)}`,
      `Horario: ${formatTime(eventData?.start_time)} - ${formatTime(eventData?.end_time)}`,
      `Ingresos: ${metrics.totalIngresos}`,
      `Free: ${metrics.totalFree}`,
      `QR Gold: ${metrics.totalGold}`,
      `Canjes: ${metrics.totalCanjes}`,
      `Inválidos: ${metrics.totalInvalidos}`,
      `Puntos otorgados: ${metrics.totalPuntos}`,
      `Top RRPP: ${metrics.topRrpp || "—"}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setInfoMessage("Resumen copiado al portapapeles.");
    } catch {
      setErrorMessage("No pude copiar el resumen.");
    }
  }

  return (
    <DashboardShell title="ADMIN · RESUMEN EVENTO">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">
              Holy Admin
            </div>
            <h1 className="mt-1 text-2xl font-black text-white">
              Resumen de evento
            </h1>
            <p className="mt-1 text-sm text-white/55">
              Vista lista para revisar, copiar y guardar como imagen.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadSummary}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
              Recargar
            </button>

            <button
              onClick={handleCopySummary}
              disabled={!eventData}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              <Copy className="h-4 w-4" />
              Copiar
            </button>

            <button
              onClick={handleExportImage}
              disabled={!eventData || exporting}
              className="inline-flex items-center gap-2 rounded-2xl bg-fuchsia-500 px-4 py-3 text-sm font-black text-white transition hover:bg-fuchsia-400 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Generando..." : "Guardar imagen"}
            </button>
          </div>
        </div>

        {!!infoMessage && (
          <div className="mb-4 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-3 text-sm text-fuchsia-200">
            {infoMessage}
          </div>
        )}

        {!!errorMessage && (
          <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-white/70">
            Cargando resumen...
          </div>
        ) : !eventData ? (
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-white/70">
            No hay datos para mostrar.
          </div>
        ) : (
          <div
            ref={cardRef}
            className="rounded-[32px] border border-fuchsia-400/20 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),rgba(0,0,0,0.96)_45%)] p-6 shadow-[0_0_50px_rgba(168,85,247,0.12)]"
          >
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">
                  HOLY CLUB · RESUMEN
                </div>
                <div className="mt-2 text-3xl font-black text-white">
                  {eventData?.name || "Sin nombre"}
                </div>
                <div className="mt-2 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                  {statusLabel}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/30 px-4 py-3 text-right">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/45">
                  Evento ID
                </div>
                <div className="mt-1 max-w-[220px] truncate text-sm font-bold text-white">
                  {eventData?.id}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center gap-2 text-white/50">
                  <CalendarDays className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                    Fecha
                  </span>
                </div>
                <div className="mt-2 text-lg font-black text-white">
                  {formatDate(eventData?.event_date)}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center gap-2 text-white/50">
                  <Clock3 className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                    Horario
                  </span>
                </div>
                <div className="mt-2 text-lg font-black text-white">
                  {formatTime(eventData?.start_time)} · {formatTime(eventData?.end_time)}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
                  Creado
                </div>
                <div className="mt-2 text-sm font-bold text-white">
                  {formatDateTime(eventData?.created_at)}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
                  Cerrado
                </div>
                <div className="mt-2 text-sm font-bold text-white">
                  {formatDateTime(eventData?.closed_at)}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <MetricCard
                icon={<Trophy className="h-5 w-5 text-fuchsia-300" />}
                label="Total ingresos"
                value={metrics.totalIngresos}
              />
              <MetricCard
                icon={<Ticket className="h-5 w-5 text-fuchsia-300" />}
                label="QR Gold"
                value={metrics.totalGold}
              />
              <MetricCard
                icon={<Gift className="h-5 w-5 text-fuchsia-300" />}
                label="Canjes"
                value={metrics.totalCanjes}
              />
              <MetricCard
                icon={<ShieldAlert className="h-5 w-5 text-fuchsia-300" />}
                label="Inválidos"
                value={metrics.totalInvalidos}
              />
              <MetricCard
                icon={<Coins className="h-5 w-5 text-fuchsia-300" />}
                label="Puntos otorgados"
                value={metrics.totalPuntos}
              />
              <MetricCard
                icon={<Sparkles className="h-5 w-5 text-fuchsia-300" />}
                label="Entradas free"
                value={metrics.totalFree}
              />
            </div>

            <div className="mt-6 grid gap-3 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <div className="text-[11px] uppercase tracking-[0.24em] text-fuchsia-300">
                  Top RRPP
                </div>
                <div className="mt-2 text-2xl font-black text-white">
                  {metrics.topRrpp || "—"}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <div className="text-[11px] uppercase tracking-[0.24em] text-fuchsia-300">
                  Nota
                </div>
                <div className="mt-2 text-sm text-white/70">
                  Este resumen toma los datos disponibles en la fila del evento.
                  Si después querés, lo conectamos a scans, canjes, gold y RRPP reales.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
      <div className="flex items-center gap-2">
        {icon}
        <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/50">
          {label}
        </div>
      </div>
      <div className="mt-3 text-3xl font-black text-white">
        {value.toLocaleString("es-AR")}
      </div>
    </div>
  );
}