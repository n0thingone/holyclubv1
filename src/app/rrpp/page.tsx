"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useActiveEvent } from "@/hooks/useActiveEvent";
import { useRrppStats } from "@/hooks/useRrppStats";
import {
  Copy, Check, Users, LogIn, Trophy, Zap, LogOut,
  Wine, GlassWater, Share2, ChevronDown, ChevronUp,
  UserCheck, Clock, Link2
} from "lucide-react";
import type { RrppProfile, GuestRegistration } from "@/types";
import { QRCodeSVG } from "qrcode.react";

export default function RrppPage() {
  const [rrpp,       setRrpp]       = useState<RrppProfile | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [copied,     setCopied]     = useState(false);
  const [showGuests, setShowGuests] = useState(false);
  const [guests,     setGuests]     = useState<GuestRegistration[]>([]);
  const { event } = useActiveEvent();
  const { stats } = useRrppStats(rrpp?.id, event?.id);
  const { profile: authProfile, loading: authLoading } = useAuth();
  const router   = useRouter();
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (authLoading) return;
    if (!authProfile) { router.push("/login"); return; }
    if (authProfile.role !== "rrpp") { router.push("/dashboard"); return; }

    supabase
      .from("rrpp_profiles").select("*").eq("profile_id", authProfile.id).single()
      .then(({ data }) => {
        setRrpp(data);
        setLoading(false);
      });
  }, [authProfile, authLoading]);

  // Load guests when toggled
  useEffect(() => {
    if (!showGuests || !rrpp || !event) return;
    supabase
      .from("guest_registrations")
      .select("*")
      .eq("rrpp_id", rrpp.id)
      .eq("event_id", event.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setGuests((data as GuestRegistration[]) || []));
  }, [showGuests, rrpp, event]);

  // Realtime guest updates
  useEffect(() => {
    if (!rrpp || !event) return;
    const ch = supabase.channel(`rrpp-guests-${rrpp.id}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "guest_registrations",
        filter: `rrpp_id=eq.${rrpp.id}`
      }, async () => {
        const { data } = await supabase
          .from("guest_registrations")
          .select("*").eq("rrpp_id", rrpp.id).eq("event_id", event.id)
          .order("created_at", { ascending: false });
        setGuests((data as GuestRegistration[]) || []);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [rrpp, event]);

  const appUrl  = typeof window !== "undefined" ? window.location.origin : "";
  const myLink  = rrpp ? `${appUrl}/lista/${rrpp.slug}` : "";
  const bottle  = stats.rewards.find(r => r.reward_type === "bottle");
  const trigger = bottle?.trigger_count ?? 35;
  const pct     = Math.min((stats.checkedIn / trigger) * 100, 100);

  function copyLink() {
    if (!myLink) return;
    navigator.clipboard.writeText(myLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareLink() {
    if (!myLink || !navigator.share) return;
    await navigator.share({ title: "Anotate en Holy Club", url: myLink }).catch(() => {});
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) return (
    <div className="min-h-dvh flex items-center justify-center bg-background">
      <Zap className="w-10 h-10 text-accent-purple animate-pulse" />
    </div>
  );

  return (
    <div className="min-h-dvh bg-background mesh-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-purple flex items-center justify-center">
            <Zap className="w-4 h-4 text-black" fill="black" />
          </div>
          <span className="font-display text-sm font-bold tracking-widest text-white">HOLY</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] text-text-muted uppercase tracking-widest">RRPP</p>
            <p className="text-sm text-accent-purple font-bold leading-none">{rrpp?.display_name}</p>
          </div>
          <button onClick={signOut} className="p-2 rounded-lg bg-card border border-border text-text-muted hover:text-danger transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="px-4 py-6 space-y-5 max-w-sm mx-auto animate-fade-in pb-10">

        {/* ── My Link ─────────────────────────────────── */}
        {rrpp && (
          <div className="holy-card bg-gradient-card">
            <div className="flex items-center gap-1.5 mb-3">
              <Link2 className="w-3.5 h-3.5 text-accent-purple" />
              <p className="holy-label mb-0">Tu Link de Registro</p>
            </div>
            <div className="flex items-center gap-2 bg-background/60 rounded-xl px-3 py-2.5 mb-2">
              <span className="text-sm text-accent-purple flex-1 truncate font-mono">{myLink}</span>
              <button
                onClick={copyLink}
                className="flex-shrink-0 p-1.5 rounded-lg bg-card border border-border text-text-muted hover:text-accent-purple transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {copied && <p className="text-success text-xs animate-fade-in">✓ Link copiado al portapapeles</p>}

            <div className="flex gap-2 mt-3">
              <button onClick={copyLink} className="flex-1 holy-btn-primary py-3 text-xs">
                <Copy className="w-3.5 h-3.5 inline mr-1.5" /> COPIAR
              </button>
              {typeof navigator !== "undefined" && "share" in navigator && (
                <button onClick={shareLink} className="flex-1 holy-btn-secondary py-3 text-xs">
                  <Share2 className="w-3.5 h-3.5 inline mr-1.5" /> COMPARTIR
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── No event ─────────────────────────────────── */}
        {!event && (
          <div className="holy-card text-center py-8">
            <Clock className="w-10 h-10 mx-auto mb-2 text-text-muted opacity-30" />
            <p className="text-text-muted">Sin evento activo esta noche</p>
          </div>
        )}

        {/* ── Stats noche ───────────────────────────────── */}
        {event && (
          <div className="grid grid-cols-3 gap-3">
            <div className="stat-card">
              <div className="flex items-center gap-1 mb-1">
                <Users className="w-3.5 h-3.5 text-accent-purple" />
                <span className="stat-label">Anotados</span>
              </div>
              <span className="stat-value">{stats.registered}</span>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-1 mb-1">
                <LogIn className="w-3.5 h-3.5 text-success" />
                <span className="stat-label">Ingresos</span>
              </div>
              <span className="stat-value text-success">{stats.checkedIn}</span>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-1 mb-1">
                <Trophy className="w-3.5 h-3.5 text-gold" />
                <span className="stat-label">Posición</span>
              </div>
              <span className="stat-value text-gold">
                {stats.position > 0 ? `#${stats.position}` : "–"}
              </span>
            </div>
          </div>
        )}

        {/* ── Bottle progress ──────────────────────────── */}
        {event && bottle && (
          <div className={`holy-card ${bottle.status === "unlocked" ? "border-success/40 bg-success/5" : ""}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wine className={`w-5 h-5 ${bottle.status === "unlocked" ? "text-success" : "text-accent-purple"}`} />
                <span className="font-display text-sm font-bold tracking-widest text-white">
                  {bottle.title.toUpperCase()}
                </span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border ${
                bottle.status === "unlocked" ? "bg-success/20 text-success border-success/30" :
                bottle.status === "redeemed" ? "bg-text-muted/20 text-text-muted border-text-muted/30" :
                "bg-card text-text-muted border-border"
              }`}>
                {bottle.status === "locked" ? `${stats.checkedIn}/${trigger}` :
                 bottle.status === "unlocked" ? "🎉 GANADO" : "✓ CANJEADO"}
              </span>
            </div>

            <div className="h-3 bg-background rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  bottle.status === "unlocked" || bottle.status === "redeemed" ? "bg-success" : "bg-gradient-purple"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>

            <p className="text-xs text-text-muted">
              {bottle.status === "locked"
                ? `Faltan ${Math.max(0, trigger - stats.checkedIn)} ingresos para desbloquear`
                : bottle.status === "unlocked"
                ? "¡Mostrá el QR de abajo en la barra!"
                : "Premio ya canjeado esta noche"}
            </p>
          </div>
        )}

        {/* ── Reward QR (bottle unlocked) ──────────────── */}
        {event && stats.rewards.find(r => r.status === "unlocked" && r.qr_token) && (
          <div className="holy-card bg-success/5 border-success/30 text-center">
            <p className="font-display text-sm font-bold tracking-widest text-success mb-4 flex items-center justify-center gap-2">
              <Wine className="w-4 h-4" /> QR PARA CANJEAR TU PREMIO
            </p>
            <div className="bg-white rounded-2xl p-5 inline-block mx-auto mb-3 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
              <QRCodeSVG
                value={stats.rewards.find(r => r.status === "unlocked")!.qr_token!}
                size={180} level="H"
              />
            </div>
            <p className="text-text-muted text-xs">Presentalo en la barra para reclamar</p>
          </div>
        )}

        {/* ── Benefits ─────────────────────────────────── */}
        {event && stats.benefits.length > 0 && (
          <div className="holy-card">
            <p className="holy-label flex items-center gap-1.5 mb-3">
              <GlassWater className="w-3.5 h-3.5 text-accent-purple" /> Beneficios de la noche
            </p>
            <div className="space-y-2">
              {stats.benefits.map(b => (
                <div key={b.id} className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${
                  b.status === "redeemed"
                    ? "bg-background/30 opacity-60"
                    : "bg-accent-purple/10 border border-accent-purple/20"
                }`}>
                  <span className="text-sm font-semibold">{b.title}</span>
                  <span className={`text-xs font-bold uppercase tracking-widest ${
                    b.status === "redeemed" ? "text-text-muted" : "text-accent-purple"
                  }`}>
                    {b.status === "redeemed" ? "CANJEADO" : "DISPONIBLE ✓"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Guest list toggle ─────────────────────────── */}
        {event && (
          <button
            onClick={() => setShowGuests(!showGuests)}
            className="holy-btn-secondary flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              MI LISTA ({stats.registered} anotados)
            </span>
            {showGuests ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}

        {/* ── Guest list ───────────────────────────────── */}
        {showGuests && event && (
          <div className="holy-card animate-slide-up">
            {guests.length === 0 ? (
              <div className="text-center py-6">
                <Users className="w-8 h-8 mx-auto mb-2 text-text-muted opacity-30" />
                <p className="text-text-muted text-sm">Nadie anotado todavía</p>
                <p className="text-text-muted text-xs mt-1">Compartí tu link para que se anoten</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {guests.map((g, i) => (
                  <div key={g.id} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-text-muted w-5 font-mono">{i + 1}</span>
                      <div>
                        <p className="text-sm font-semibold text-text-primary leading-none">
                          {g.first_name} {g.last_name}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5 font-mono">
                          DNI ···{g.dni_last3}
                        </p>
                      </div>
                    </div>
                    <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${
                      g.registration_status === "checked_in"
                        ? "bg-success/20 text-success"
                        : "bg-card text-text-muted"
                    }`}>
                      {g.registration_status === "checked_in"
                        ? <><UserCheck className="w-3 h-3" /> Ingresó</>
                        : <><Clock className="w-3 h-3" /> Pendiente</>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Mini QR de tu link ───────────────────────── */}
        {rrpp && (
          <div className="holy-card text-center">
            <p className="holy-label mb-3">QR de tu link</p>
            <div className="bg-white rounded-xl p-4 inline-block mx-auto mb-2">
              <QRCodeSVG value={myLink} size={120} level="M" />
            </div>
            <p className="text-text-muted text-xs">
              Mostrá este QR para que tus invitados se anoten
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
