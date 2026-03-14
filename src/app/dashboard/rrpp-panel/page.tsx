"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useActiveEvent } from "@/hooks/useActiveEvent";
import { useRanking } from "@/hooks/useRanking";
import {
  Users, Trophy, Copy, Check, ToggleLeft, ToggleRight,
  ChevronDown, ChevronUp, UserCheck, Clock
} from "lucide-react";
import type { RrppProfile, GuestRegistration } from "@/types";

interface RrppWithStats extends RrppProfile {
  registered: number;
  checkedIn: number;
}

export default function RrppAdminPanel() {
  const { event } = useActiveEvent();
  const { ranking } = useRanking(event?.id);
  const [rrpps, setRrpps] = useState<RrppWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [guests, setGuests] = useState<Record<string, GuestRegistration[]>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => { fetchAll(); }, [event]);

  async function fetchAll() {
    setLoading(true);
    const { data: rrppList } = await supabase
      .from("rrpp_profiles")
      .select("*")
      .order("display_name", { ascending: true });

    if (!rrppList) { setLoading(false); return; }

    // Get stats for each RRPP
    if (event) {
      const stats = await Promise.all(
        rrppList.map(async r => {
          const [{ count: regCount }, { data: checkinData }] = await Promise.all([
            supabase.from("guest_registrations").select("id", { count: "exact" })
              .eq("rrpp_id", r.id).eq("event_id", event.id),
            supabase.from("checkins").select("result")
              .eq("event_id", event.id)
              .in("registration_id",
                (await supabase.from("guest_registrations")
                  .select("id").eq("rrpp_id", r.id).eq("event_id", event.id)
                ).data?.map(g => g.id) || []
              )
          ]);
          return {
            ...r,
            registered: regCount || 0,
            checkedIn: checkinData?.filter(c => c.result === "valid_entry").length || 0,
          };
        })
      );
      setRrpps(stats);
    } else {
      setRrpps(rrppList.map(r => ({ ...r, registered: 0, checkedIn: 0 })));
    }
    setLoading(false);
  }

  async function toggleActive(rrpp: RrppWithStats) {
    await supabase.from("rrpp_profiles").update({ active: !rrpp.active }).eq("id", rrpp.id);
    fetchAll();
  }

  async function loadGuests(rrppId: string) {
    if (!event) return;
    if (guests[rrppId]) return; // already loaded
    const { data } = await supabase
      .from("guest_registrations")
      .select("*")
      .eq("rrpp_id", rrppId)
      .eq("event_id", event.id)
      .order("created_at", { ascending: false });
    setGuests(prev => ({ ...prev, [rrppId]: (data as GuestRegistration[]) || [] }));
  }

  function toggleExpand(id: string) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    loadGuests(id);
  }

  function copyLink(slug: string) {
    navigator.clipboard.writeText(`${appUrl}/lista/${slug}`);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  }

  function getRankPos(rrppId: string) {
    return ranking.find(r => r.rrpp_id === rrppId)?.position;
  }

  // Sort: by checkin count desc
  const sorted = [...rrpps].sort((a, b) => b.checkedIn - a.checkedIn);

  return (
    <div className="px-4 py-6 space-y-5 max-w-lg mx-auto animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-black tracking-widest text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-accent-purple" /> RRPP
        </h1>
        <p className="text-text-muted text-sm mt-1">
          {rrpps.filter(r => r.active).length} activos · {rrpps.length} total
        </p>
      </div>

      {/* Summary cards */}
      {event && (
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card">
            <span className="stat-label">Anotados total</span>
            <span className="stat-value">{rrpps.reduce((s,r) => s + r.registered, 0)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Ingresos total</span>
            <span className="stat-value text-success">{rrpps.reduce((s,r) => s + r.checkedIn, 0)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">RRPP activos</span>
            <span className="stat-value text-accent-pink">{rrpps.filter(r => r.active).length}</span>
          </div>
        </div>
      )}

      {/* RRPP list */}
      {loading ? (
        <div className="holy-card py-10 text-center">
          <div className="w-8 h-8 border-2 border-accent-purple/30 border-t-accent-purple rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((r, i) => {
            const pos = getRankPos(r.id);
            const link = `${appUrl}/lista/${r.slug}`;
            const isExpanded = expanded === r.id;
            const guestList = guests[r.id] || [];

            return (
              <div
                key={r.id}
                className={`holy-card transition-all duration-200 ${
                  !r.active ? "opacity-50" : ""
                } ${i === 0 && event ? "border-accent-purple/30 bg-gradient-card" : ""}`}
              >
                {/* Main row */}
                <div className="flex items-center gap-3">
                  {/* Position badge */}
                  {event && pos && pos <= 3 ? (
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                      pos === 1 ? "bg-yellow-500 text-black" :
                      pos === 2 ? "bg-slate-400 text-black" : "bg-amber-700 text-white"
                    }`}>
                      {["🥇","🥈","🥉"][pos-1]}
                    </div>
                  ) : event ? (
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-card border border-border flex-shrink-0">
                      <span className="font-display text-xs font-bold text-text-muted">
                        {pos ? `#${pos}` : "–"}
                      </span>
                    </div>
                  ) : null}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-text-primary truncate">{r.display_name}</p>
                      {!r.active && (
                        <span className="text-[10px] bg-text-muted/20 text-text-muted px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          OFF
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-accent-purple font-mono">/lista/{r.slug}</p>
                  </div>

                  {/* Stats */}
                  {event && (
                    <div className="text-right flex-shrink-0">
                      <p className="font-display text-xl font-black text-success">{r.checkedIn}</p>
                      <p className="text-[10px] text-text-muted">{r.registered} anotados</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => copyLink(r.slug)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-background border border-border text-text-muted hover:text-accent-purple hover:border-accent-purple/50 transition-colors text-xs font-semibold"
                  >
                    {copied === r.slug
                      ? <><Check className="w-3.5 h-3.5 text-success" /> Copiado</>
                      : <><Copy className="w-3.5 h-3.5" /> Copiar link</>}
                  </button>

                  <button
                    onClick={() => toggleActive(r)}
                    className={`flex items-center gap-1.5 py-2 px-3 rounded-xl border transition-colors text-xs font-semibold ${
                      r.active
                        ? "bg-success/10 border-success/30 text-success hover:bg-danger/10 hover:border-danger/30 hover:text-danger"
                        : "bg-card border-border text-text-muted hover:bg-success/10 hover:border-success/30 hover:text-success"
                    }`}
                  >
                    {r.active
                      ? <><ToggleRight className="w-4 h-4" /> Activo</>
                      : <><ToggleLeft className="w-4 h-4" /> Inactivo</>}
                  </button>

                  {event && (
                    <button
                      onClick={() => toggleExpand(r.id)}
                      className="p-2 rounded-xl bg-background border border-border text-text-muted hover:text-text-primary transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                {/* Expanded guest list */}
                {isExpanded && event && (
                  <div className="mt-4 pt-4 border-t border-border animate-slide-up">
                    <p className="holy-label mb-2">
                      Lista de invitados — {guestList.length} anotados
                    </p>
                    {guestList.length === 0 ? (
                      <p className="text-text-muted text-xs text-center py-4">
                        Sin invitados anotados todavía
                      </p>
                    ) : (
                      <div className="space-y-0.5 max-h-64 overflow-y-auto">
                        {guestList.map((g, gi) => (
                          <div
                            key={g.id}
                            className={`flex items-center justify-between py-2 border-b border-border/30 last:border-0 ${
                              g.registration_status === "checked_in" ? "opacity-100" : "opacity-70"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-text-muted w-5 font-mono">{gi + 1}</span>
                              <div>
                                <p className="text-sm font-semibold leading-none">
                                  {g.first_name} {g.last_name}
                                </p>
                                <p className="text-xs text-text-muted font-mono">···{g.dni_last3}</p>
                              </div>
                            </div>
                            <span className={`flex items-center gap-1 text-xs font-semibold ${
                              g.registration_status === "checked_in" ? "text-success" : "text-text-muted"
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
