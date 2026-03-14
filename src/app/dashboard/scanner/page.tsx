"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useActiveEvent } from "@/hooks/useActiveEvent";
import { QRScanner } from "@/components/scanner/QRScanner";
import { isWithinTime } from "@/lib/utils";
import { CheckCircle, XCircle, Clock, RefreshCw, ScanLine, LogIn, Zap } from "lucide-react";
import type { ScanResult } from "@/types";

interface RecentEntry {
  id: string; name: string; rrpp: string; time: string; result: string; color: string;
}

export default function ScannerPage() {
  const { event } = useActiveEvent();
  const [scanResult,    setScanResult]    = useState<ScanResult | null>(null);
  const [scanActive,    setScanActive]    = useState(true);
  const [staffId,       setStaffId]       = useState<string | null>(null);
  const [recent,        setRecent]        = useState<RecentEntry[]>([]);
  const [nightStats,    setNightStats]    = useState({ valid: 0, invalid: 0, gold: 0 });
  const processingRef = useRef(false);
  const supabase = getSupabaseClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => { if (user) setStaffId(user.id); });
  }, []);

  useEffect(() => {
    if (!event) return;
    fetchNightStats();
    const ch = supabase.channel("scanner-stats")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "checkins" }, fetchNightStats)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [event]);

  async function fetchNightStats() {
    if (!event) return;
    const { data } = await supabase.from("checkins").select("result").eq("event_id", event.id);
    if (data) setNightStats({
      valid:   data.filter(c => c.result === "valid_entry").length,
      gold:    data.filter(c => c.result === "gold_entry").length,
      invalid: data.filter(c => ["used_qr","expired_qr","invalid_qr"].includes(c.result)).length,
    });
  }

  const handleScan = useCallback(async (token: string) => {
    if (processingRef.current || !event || !staffId) return;
    processingRef.current = true;
    setScanActive(false);

    const result = await processQr(token, event.id, staffId);
    setScanResult(result);

    if (["valid_entry", "gold_entry"].includes(result.result)) {
      setRecent(prev => [{
        id: Date.now().toString(), name: result.message,
        rrpp: result.rrppName || "—",
        time: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
        result: result.result, color: result.color,
      }, ...prev].slice(0, 6));
    }

    setTimeout(() => {
      setScanResult(null); setScanActive(true); processingRef.current = false;
    }, 3200);
  }, [event, staffId]);

  async function processQr(token: string, eventId: string, by: string): Promise<ScanResult> {
    const { data: gold } = await supabase.from("gold_qrs")
      .select("*").eq("qr_token", token).eq("event_id", eventId).single();
    if (gold) {
      if (gold.status !== "active" || gold.used_count >= gold.max_uses)
        return { success: false, result: "used_qr", message: "QR Gold agotado", color: "red" };
      await supabase.from("gold_qrs").update({ used_count: gold.used_count + 1 }).eq("id", gold.id);
      await supabase.from("checkins").insert({ event_id: eventId, result: "gold_entry", checked_in_by: by });
      return { success: true, result: "gold_entry", message: gold.title, color: "gold" };
    }

    const { data: g } = await supabase.from("guest_registrations")
      .select("*, rrpp_profiles(display_name)")
      .eq("qr_token", token).eq("event_id", eventId).single();

    if (!g) return { success: false, result: "invalid_qr", message: "QR no encontrado", color: "red" };
    if (g.registration_status === "checked_in")
      return { success: false, result: "used_qr", message: `${g.first_name} ${g.last_name} ya ingresó`, color: "red" };
    if (!isWithinTime(event?.qr_entry_until ?? null))
      return { success: false, result: "expired_qr", message: "Horario de QR finalizado", color: "yellow" };

    await supabase.from("guest_registrations").update({ registration_status: "checked_in" }).eq("id", g.id);
    await supabase.from("checkins").insert({
      event_id: eventId, registration_id: g.id,
      rrpp_id: g.rrpp_id, checked_in_by: by, result: "valid_entry",
    });
    return {
      success: true, result: "valid_entry",
      message: `${g.first_name} ${g.last_name}`,
      rrppName: g.rrpp_profiles?.display_name, guest: g, color: "green",
    };
  }

  const RC = {
    green:  { bg: "bg-success/10 border-success/50", text: "text-success", shadow: "shadow-[0_0_60px_rgba(34,197,94,0.4)]",  Icon: CheckCircle },
    yellow: { bg: "bg-warning/10 border-warning/50", text: "text-warning", shadow: "shadow-[0_0_60px_rgba(234,179,8,0.3)]",  Icon: Clock       },
    red:    { bg: "bg-danger/10  border-danger/50",  text: "text-danger",  shadow: "shadow-[0_0_60px_rgba(239,68,68,0.4)]",  Icon: XCircle     },
    gold:   { bg: "bg-gold/10   border-gold/40",     text: "text-gold",    shadow: "shadow-[0_0_60px_rgba(245,158,11,0.5)]", Icon: Zap         },
  };
  const labels: Record<string,string> = {
    valid_entry: "ENTRA FREE ✓", gold_entry: "✦ GOLD ENTRY",
    used_qr: "QR YA USADO ✗", expired_qr: "QR VENCIDO ⏱", invalid_qr: "QR INVÁLIDO ✗",
  };

  return (
    <div className="px-4 py-5 space-y-4 max-w-sm mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black tracking-widest text-white flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-accent-purple" /> TAQUILLA
          </h1>
          <p className={`text-xs mt-0.5 ${event ? "text-text-muted" : "text-danger"}`}>
            {event ? event.name : "⚠ Sin evento activo"}
          </p>
        </div>
        {event?.qr_entry_until && (
          <div className="holy-card py-2 px-3 text-right">
            <p className="text-[10px] text-text-muted uppercase tracking-widest">QR hasta</p>
            <p className="font-display text-lg font-bold text-accent-purple">
              {new Date(event.qr_entry_until).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}
            </p>
          </div>
        )}
      </div>

      {/* Stats */}
      {event && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Free",      val: nightStats.valid,   color: "text-success" },
            { label: "Gold",      val: nightStats.gold,    color: "text-gold" },
            { label: "Rechazos",  val: nightStats.invalid, color: "text-danger" },
          ].map(s => (
            <div key={s.label} className="holy-card py-3 text-center">
              <p className={`font-display text-2xl font-black ${s.color}`}>{s.val}</p>
              <p className="text-[10px] text-text-muted uppercase tracking-widest mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Scanner / Result */}
      {!scanResult ? (
        <div className="animate-fade-in">
          <QRScanner onScan={handleScan} active={scanActive && !!event} />
          <p className="text-center text-text-muted text-xs mt-3 tracking-widest uppercase">
            {event ? "Apuntá la cámara al QR" : "Scanner desactivado"}
          </p>
        </div>
      ) : (() => {
        const cfg = RC[scanResult.color];
        return (
          <div className={`holy-card border-2 text-center py-10 animate-scale-in ${cfg.bg} ${cfg.shadow}`}>
            <cfg.Icon className={`w-20 h-20 mx-auto mb-4 ${cfg.text}`} />
            <div className={`font-display text-3xl font-black tracking-widest mb-3 ${cfg.text}`}>
              {labels[scanResult.result]}
            </div>
            <p className="text-white text-xl font-bold">{scanResult.message}</p>
            {scanResult.rrppName && (
              <p className="text-text-muted text-sm mt-1.5">
                RRPP: <span className="text-accent-purple font-semibold">{scanResult.rrppName}</span>
              </p>
            )}
            <p className="text-text-muted/40 text-xs mt-5 font-mono">{new Date().toLocaleTimeString("es-AR")}</p>
          </div>
        );
      })()}

      {scanResult && (
        <button
          onClick={() => { setScanResult(null); setScanActive(true); processingRef.current = false; }}
          className="holy-btn-secondary flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> ESCANEAR OTRO
        </button>
      )}

      {/* Recent */}
      {recent.length > 0 && !scanResult && (
        <div className="holy-card">
          <p className="font-display text-[10px] tracking-widest text-text-muted uppercase mb-3 flex items-center gap-1.5">
            <LogIn className="w-3 h-3" /> Últimos ingresos
          </p>
          <div className="space-y-0.5">
            {recent.map(e => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div>
                  <p className="text-sm text-text-primary font-semibold leading-none">{e.name}</p>
                  <p className="text-xs text-text-muted mt-0.5">{e.rrpp}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-bold ${e.color === "gold" ? "text-gold" : "text-success"}`}>
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
