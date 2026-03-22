"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useActiveEvent } from "@/hooks/useActiveEvent";
import QRScanner from "@/components/scanner/QRScanner";
import { isWithinTime } from "@/lib/utils";
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ScanLine,
  LogIn,
  Zap,
} from "lucide-react";
import type { ScanResult } from "@/types";

type ScannerMode = "auto" | "entrada" | "gold";

interface RecentEntry {
  id: string;
  name: string;
  rrpp: string;
  time: string;
  result: string;
  color: string;
}

export default function ScannerPage() {
  const { event, refreshEvent } = useActiveEvent();
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [nightStats, setNightStats] = useState({
    valid: 0,
    invalid: 0,
    gold: 0,
  });
  const [mode, setMode] = useState<ScannerMode>("auto");
  const [processing, setProcessing] = useState(false);

  const processingRef = useRef(false);
  const supabase = getSupabaseClient();

  useEffect(() => {
    let alive = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!alive) return;
      if (user) setStaffId(user.id);
    });

    return () => {
      alive = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!event) {
      setNightStats({ valid: 0, invalid: 0, gold: 0 });
      return;
    }

    void fetchNightStats();

    const ch = supabase
      .channel(`scanner-stats-${event.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "checkins",
          filter: `event_id=eq.${event.id}`,
        },
        () => {
          void fetchNightStats();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [event?.id, supabase]);

  async function fetchNightStats() {
    if (!event) return;

    const { data, error } = await supabase
      .from("checkins")
      .select("result")
      .eq("event_id", event.id);

    if (error || !data) return;

    setNightStats({
      valid: data.filter((c) => c.result === "valid_entry").length,
      gold: data.filter((c) => c.result === "gold_entry").length,
      invalid: data.filter((c) =>
        ["used_qr", "expired_qr", "invalid_qr"].includes(c.result)
      ).length,
    });
  }

  const handleScan = useCallback(
    async (token: string) => {
      if (processingRef.current || !event || !staffId) return;

      processingRef.current = true;
      setProcessing(true);

      try {
        const result = await processQr(token, event.id, staffId, mode);
        setScanResult(result);

        if (["valid_entry", "gold_entry"].includes(result.result)) {
          setRecent((prev) =>
            [
              {
                id: `${Date.now()}-${Math.random()}`,
                name: result.message,
                rrpp: result.rrppName || "—",
                time: new Date().toLocaleTimeString("es-AR", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                result: result.result,
                color: result.color,
              },
              ...prev,
            ].slice(0, 6)
          );
        }

        void fetchNightStats();
      } finally {
        setTimeout(() => {
          setScanResult(null);
          setProcessing(false);
          processingRef.current = false;
        }, 3200);
      }
    },
    [event, staffId, mode]
  );

  async function processQr(
    token: string,
    eventId: string,
    by: string,
    scannerMode: ScannerMode
  ): Promise<ScanResult> {
    const cleanToken = token.trim();

    const { data: gold, error: goldError } = await supabase
      .from("gold_qrs")
      .select("*")
      .eq("qr_token", cleanToken)
      .eq("event_id", eventId)
      .maybeSingle();

    if (goldError) {
      return {
        success: false,
        result: "invalid_qr",
        message: "Error validando QR Gold",
        color: "red",
      };
    }

    if (gold) {
      if (scannerMode === "entrada") {
        return {
          success: false,
          result: "invalid_qr",
          message: "Este QR es GOLD y el scanner está en modo ENTRADA",
          color: "yellow",
        };
      }

      if (gold.status !== "active" || gold.used_count >= gold.max_uses) {
        await supabase.from("checkins").insert({
          event_id: eventId,
          checked_in_by: by,
          result: "used_qr",
        });

        return {
          success: false,
          result: "used_qr",
          message: "QR Gold agotado",
          color: "red",
        };
      }

      const { error: goldUpdateError } = await supabase
        .from("gold_qrs")
        .update({ used_count: gold.used_count + 1 })
        .eq("id", gold.id);

      if (goldUpdateError) {
        return {
          success: false,
          result: "invalid_qr",
          message: "No se pudo actualizar el QR Gold",
          color: "red",
        };
      }

      await supabase.from("checkins").insert({
        event_id: eventId,
        result: "gold_entry",
        checked_in_by: by,
      });

      return {
        success: true,
        result: "gold_entry",
        message: gold.title || "Ingreso Gold",
        color: "gold",
      };
    }

    const { data: g, error: guestError } = await supabase
      .from("guest_registrations")
      .select("*, rrpp_profiles(display_name)")
      .eq("qr_token", cleanToken)
      .eq("event_id", eventId)
      .maybeSingle();

    if (guestError) {
      return {
        success: false,
        result: "invalid_qr",
        message: "Error validando invitado",
        color: "red",
      };
    }

    if (!g) {
      await supabase.from("checkins").insert({
        event_id: eventId,
        checked_in_by: by,
        result: "invalid_qr",
      });

      return {
        success: false,
        result: "invalid_qr",
        message: "QR no encontrado",
        color: "red",
      };
    }

    if (scannerMode === "gold") {
      return {
        success: false,
        result: "invalid_qr",
        message: "Este QR es FREE y el scanner está en modo GOLD",
        color: "yellow",
      };
    }

    if (g.registration_status === "checked_in") {
      await supabase.from("checkins").insert({
        event_id: eventId,
        registration_id: g.id,
        rrpp_id: g.rrpp_id,
        checked_in_by: by,
        result: "used_qr",
      });

      return {
        success: false,
        result: "used_qr",
        message: `${g.first_name} ${g.last_name} ya ingresó`,
        color: "red",
      };
    }

    if (!isWithinTime(event?.qr_entry_until ?? null)) {
      await supabase.from("checkins").insert({
        event_id: eventId,
        registration_id: g.id,
        rrpp_id: g.rrpp_id,
        checked_in_by: by,
        result: "expired_qr",
      });

      return {
        success: false,
        result: "expired_qr",
        message: "Horario de QR finalizado",
        color: "yellow",
      };
    }

    const { error: guestUpdateError } = await supabase
      .from("guest_registrations")
      .update({ registration_status: "checked_in" })
      .eq("id", g.id);

    if (guestUpdateError) {
      return {
        success: false,
        result: "invalid_qr",
        message: "No se pudo registrar el ingreso",
        color: "red",
      };
    }

    await supabase.from("checkins").insert({
      event_id: eventId,
      registration_id: g.id,
      rrpp_id: g.rrpp_id,
      checked_in_by: by,
      result: "valid_entry",
    });

    return {
      success: true,
      result: "valid_entry",
      message: `${g.first_name} ${g.last_name}`,
      rrppName: g.rrpp_profiles?.display_name,
      guest: g,
      color: "green",
    };
  }

  const RC = {
    green: {
      bg: "bg-success/10 border-success/50",
      text: "text-success",
      shadow: "shadow-[0_0_60px_rgba(34,197,94,0.4)]",
      Icon: CheckCircle,
    },
    yellow: {
      bg: "bg-warning/10 border-warning/50",
      text: "text-warning",
      shadow: "shadow-[0_0_60px_rgba(234,179,8,0.3)]",
      Icon: Clock,
    },
    red: {
      bg: "bg-danger/10 border-danger/50",
      text: "text-danger",
      shadow: "shadow-[0_0_60px_rgba(239,68,68,0.4)]",
      Icon: XCircle,
    },
    gold: {
      bg: "bg-gold/10 border-gold/40",
      text: "text-gold",
      shadow: "shadow-[0_0_60px_rgba(245,158,11,0.5)]",
      Icon: Zap,
    },
  } as const;

  const labels: Record<string, string> = {
    valid_entry: "ENTRA FREE ✓",
    gold_entry: "✦ GOLD ENTRY",
    used_qr: "QR YA USADO ✗",
    expired_qr: "QR VENCIDO ⏱",
    invalid_qr: "QR INVÁLIDO ✗",
  };

  const modeButtonClass = (value: ScannerMode) =>
    `px-3 py-2 rounded-xl text-xs font-bold tracking-widest uppercase border transition ${
      mode === value
        ? "bg-accent-purple text-white border-accent-purple"
        : "bg-transparent text-text-muted border-border hover:text-white"
    }`;

  return (
    <div className="px-4 py-5 space-y-4 max-w-sm mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black tracking-widest text-white flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-accent-purple" />
            TAQUILLA
          </h1>
          <p className={`text-xs mt-0.5 ${event ? "text-text-muted" : "text-danger"}`}>
            {event ? event.name : "⚠ Sin evento activo"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {event?.qr_entry_until && (
            <div className="holy-card py-2 px-3 text-right">
              <p className="text-[10px] text-text-muted uppercase tracking-widest">
                QR hasta
              </p>
              <p className="font-display text-lg font-bold text-accent-purple">
                {new Date(event.qr_entry_until).toLocaleTimeString("es-AR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}

          <button
            onClick={() => refreshEvent?.()}
            className="holy-card px-3 py-2 text-text-muted hover:text-white"
            title="Refrescar evento"
            type="button"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {event && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Free", val: nightStats.valid, color: "text-success" },
              { label: "Gold", val: nightStats.gold, color: "text-gold" },
              { label: "Rechazos", val: nightStats.invalid, color: "text-danger" },
            ].map((s) => (
              <div key={s.label} className="holy-card py-3 text-center">
                <p className={`font-display text-2xl font-black ${s.color}`}>{s.val}</p>
                <p className="text-[10px] text-text-muted uppercase tracking-widest mt-0.5">
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          <div className="holy-card p-3">
            <p className="text-[10px] text-text-muted uppercase tracking-widest mb-2">
              Modo scanner
            </p>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className={modeButtonClass("auto")}
                onClick={() => setMode("auto")}
              >
                Auto
              </button>
              <button
                type="button"
                className={modeButtonClass("entrada")}
                onClick={() => setMode("entrada")}
              >
                Entrada
              </button>
              <button
                type="button"
                className={modeButtonClass("gold")}
                onClick={() => setMode("gold")}
              >
                Gold
              </button>
            </div>
          </div>
        </>
      )}

      {!scanResult ? (
        <div className="animate-fade-in">
          {event ? (
            <QRScanner onScan={handleScan} paused={processing || !event || !staffId} />
          ) : (
            <div className="holy-card py-10 text-center">
              <p className="text-text-muted text-sm">No hay evento activo</p>
            </div>
          )}

          <p className="text-center text-text-muted text-xs mt-3 tracking-widest uppercase">
            {!event
              ? "Scanner desactivado"
              : processing
              ? "Procesando QR..."
              : mode === "auto"
              ? "Modo auto activo"
              : mode === "entrada"
              ? "Modo entrada activo"
              : "Modo gold activo"}
          </p>
        </div>
      ) : (() => {
        const cfg = RC[scanResult.color as keyof typeof RC] || RC.red;

        return (
          <div
            className={`holy-card border-2 text-center py-10 animate-scale-in ${cfg.bg} ${cfg.shadow}`}
          >
            <cfg.Icon className={`w-20 h-20 mx-auto mb-4 ${cfg.text}`} />

            <div className={`font-display text-3xl font-black tracking-widest mb-3 ${cfg.text}`}>
              {labels[scanResult.result]}
            </div>

            <p className="text-white text-xl font-bold">{scanResult.message}</p>

            {scanResult.rrppName && (
              <p className="text-text-muted text-sm mt-1.5">
                RRPP:{" "}
                <span className="text-accent-purple font-semibold">
                  {scanResult.rrppName}
                </span>
              </p>
            )}

            <p className="text-text-muted/40 text-xs mt-5 font-mono">
              {new Date().toLocaleTimeString("es-AR")}
            </p>
          </div>
        );
      })()}

      {scanResult && (
        <button
          onClick={() => {
            setScanResult(null);
            setProcessing(false);
            processingRef.current = false;
          }}
          className="holy-btn-secondary flex items-center justify-center gap-2"
          type="button"
        >
          <RefreshCw className="w-4 h-4" />
          ESCANEAR OTRO
        </button>
      )}

      {recent.length > 0 && !scanResult && (
        <div className="holy-card">
          <p className="font-display text-[10px] tracking-widest text-text-muted uppercase mb-3 flex items-center gap-1.5">
            <LogIn className="w-3 h-3" />
            Últimos ingresos
          </p>

          <div className="space-y-0.5">
            {recent.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
              >
                <div>
                  <p className="text-sm text-text-primary font-semibold leading-none">
                    {e.name}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">{e.rrpp}</p>
                </div>

                <div className="text-right">
                  <p
                    className={`text-xs font-bold ${
                      e.color === "gold" ? "text-gold" : "text-success"
                    }`}
                  >
                    {e.color === "gold" ? "GOLD" : "FREE"}
                  </p>
                  <p className="text-[10px] text-text-muted font-mono">{e.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}