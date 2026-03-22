"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  Sparkles,
  Gift,
  QrCode,
  Clock3,
  CalendarDays,
  ChevronRight,
  Trophy,
  Flame,
} from "lucide-react";

type EventRow = {
  id: string;
  name: string;
  event_date: string | null;
  status: string;
  registration_until: string | null;
  qr_entry_until: string | null;
  created_by: string | null;
  created_at: string | null;
  closed_at: string | null;
  show_entry_count: boolean | null;
  show_list_count: boolean | null;
};

type StatsState = {
  entryCount: number;
  listCount: number;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-AR");
}

function formatCountdown(ms: number) {
  if (ms <= 0) return "0 MIN";

  const totalMinutes = Math.floor(ms / 1000 / 60);

  if (totalMinutes <= 10) {
    return "🔥 POR COMENZAR";
  }

  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days} ${days === 1 ? "DIA" : "DIAS"}`);
  }

  if (hours > 0) {
    parts.push(`${hours} HS`);
  }

  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes} MIN`);
  }

  return parts.join(" • ");
}

function ActionCard({
  href,
  icon: Icon,
  title,
  subtitle,
  glowClassName,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  glowClassName?: string;
}) {
  return (
    <Link
      href={href}
      className={`group relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.05] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-fuchsia-500/40 hover:bg-white/[0.08] hover:shadow-[0_0_25px_rgba(217,70,239,0.15)] ${glowClassName || ""}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.14),transparent_38%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-white/90">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="font-semibold text-white">{title}</div>
          <div className="text-sm text-white/50">{subtitle}</div>
        </div>

        <ChevronRight className="h-4 w-4 text-white/35 transition group-hover:translate-x-0.5 group-hover:text-white/70" />
      </div>
    </Link>
  );
}

export default function PuntosHomePage() {
  const supabase = getSupabaseClient();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activeEvent, setActiveEvent] = useState<EventRow | null>(null);
  const [stats, setStats] = useState<StatsState>({
    entryCount: 0,
    listCount: 0,
  });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  async function loadStats(eventId: string) {
    try {
      const [listRes, entryRes] = await Promise.all([
        supabase
          .from("guests")
          .select("*", { count: "exact", head: true })
          .eq("event_id", eventId),

        supabase
          .from("guest_entries")
          .select("*", { count: "exact", head: true })
          .eq("event_id", eventId),
      ]);

      setStats({
        listCount: listRes.error ? 0 : listRes.count ?? 0,
        entryCount: entryRes.error ? 0 : entryRes.count ?? 0,
      });
    } catch (err) {
      console.error("Error cargando stats del evento:", err);
      setStats({
        entryCount: 0,
        listCount: 0,
      });
    }
  }

  async function loadActiveEvent() {
    setLoading(true);

    const { data, error } = await supabase
      .from("events")
      .select(
        "id, name, event_date, status, registration_until, qr_entry_until, created_by, created_at, closed_at, show_entry_count, show_list_count"
      )
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      console.error("Error cargando evento activo:", error.message);
      setActiveEvent(null);
      setStats({
        entryCount: 0,
        listCount: 0,
      });
      setLoading(false);
      return;
    }

    setActiveEvent((data as EventRow | null) ?? null);

    if (data?.id) {
      await loadStats(data.id);
    } else {
      setStats({
        entryCount: 0,
        listCount: 0,
      });
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadActiveEvent();
  }, []);

  useEffect(() => {
    if (!activeEvent?.id) return;

    const interval = setInterval(() => {
      void loadStats(activeEvent.id);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeEvent?.id]);

  useEffect(() => {
    const channel = supabase
      .channel("client-home-event-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => {
          void loadActiveEvent();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    if (!activeEvent?.id) return;

    const channel = supabase
      .channel("client-home-guests-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guests" },
        () => {
          void loadStats(activeEvent.id);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeEvent?.id, supabase]);

  useEffect(() => {
    if (!activeEvent?.id) return;

    const channel = supabase
      .channel("client-home-entries-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guest_entries" },
        () => {
          void loadStats(activeEvent.id);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeEvent?.id, supabase]);

  const heroData = useMemo(() => {
    if (!activeEvent) {
      return {
        title: "SIN EVENTO ACTIVO",
        subtitle: "Todavía no hay evento cargado",
        badge: "ESPERANDO EVENTO",
        badgeClass: "border-white/15 bg-white/5 text-white/70",
      };
    }

    if (activeEvent.status === "closed") {
      return {
        title: activeEvent.name,
        subtitle: "🔴 EVENTO FINALIZADO",
        badge: "CERRADO",
        badgeClass: "border-red-400/30 bg-red-400/10 text-red-300",
      };
    }

    const eventTs = activeEvent.event_date
      ? new Date(activeEvent.event_date).getTime()
      : null;

    const regTs = activeEvent.registration_until
      ? new Date(activeEvent.registration_until).getTime()
      : null;

    if (eventTs && now < eventTs) {
      const countdownText = formatCountdown(eventTs - now);

      return {
        title: activeEvent.name,
        subtitle:
          countdownText === "🔥 POR COMENZAR"
            ? "🔥 POR COMENZAR"
            : `⏳ INICIA EN ${countdownText}`,
        badge: regTs && now < regTs ? "LISTAS ABIERTAS" : "LISTAS CERRADAS",
        badgeClass:
          regTs && now < regTs
            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
            : "border-amber-400/30 bg-amber-400/10 text-amber-300",
      };
    }

    return {
      title: activeEvent.name,
      subtitle: "🟢 EN VIVO",
      badge: regTs && now < regTs ? "LISTAS ABIERTAS" : "LISTAS CERRADAS",
      badgeClass:
        regTs && now < regTs
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
          : "border-amber-400/30 bg-amber-400/10 text-amber-300",
    };
  }, [activeEvent, now]);

  const balance =
    typeof (profile as any)?.holy_points_balance === "number"
      ? (profile as any).holy_points_balance
      : 0;

  const eventEnergyText = useMemo(() => {
    if (!activeEvent) return null;
    if (!activeEvent.show_entry_count) return null;
    if (stats.entryCount >= 300) return "🔥 HOLY explotando";
    if (stats.entryCount >= 150) return "⚡ Muchísima gente adentro";
    if (stats.entryCount >= 50) return "✨ El evento se está poniendo";
    return null;
  }, [activeEvent, stats.entryCount]);

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[32px] border border-fuchsia-500/30 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.28),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.18),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 shadow-[0_0_80px_rgba(168,85,247,0.22)] backdrop-blur-xl">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.15))]" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-fuchsia-300">
            <Sparkles className="h-3.5 w-3.5" />
            Evento activo
          </div>

          <h2 className="mt-4 text-4xl font-black tracking-tight text-white">
            {loading ? "Cargando..." : heroData.title}
          </h2>

          <div className="mt-3 min-h-[32px] text-lg font-semibold text-white/90">
            {loading ? (
              "Buscando evento..."
            ) : heroData.subtitle === "🟢 EN VIVO" ? (
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 animate-pulse rounded-full bg-emerald-400" />
                </span>
                <span className="text-white">EN VIVO</span>
              </div>
            ) : (
              heroData.subtitle
            )}
          </div>

          <div
            className={`mt-4 inline-flex items-center rounded-full border px-4 py-2 text-sm font-bold ${heroData.badgeClass}`}
          >
            {heroData.badge}
          </div>

          {activeEvent ? (
            <>
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-md">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                    Fecha del evento
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white/90">
                    {formatDate(activeEvent.event_date)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-md">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                    Listas hasta
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white/90">
                    {formatDate(activeEvent.registration_until)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-md sm:col-span-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                    QR entrada hasta
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white/90">
                    {formatDate(activeEvent.qr_entry_until)}
                  </p>
                </div>
              </div>

              {(activeEvent.show_entry_count ||
                activeEvent.show_list_count ||
                eventEnergyText) && (
                <div className="mt-4 space-y-3">
                  {eventEnergyText ? (
                    <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-300 shadow-[0_0_30px_rgba(251,191,36,0.08)]">
                      {eventEnergyText}
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {activeEvent.show_entry_count ? (
                      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-300 shadow-[0_0_25px_rgba(52,211,153,0.07)]">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/70">
                          Ingresaron
                        </p>
                        <div className="mt-2 flex items-end gap-2">
                          <span className="text-3xl font-black">
                            {stats.entryCount}
                          </span>
                          <span className="pb-1 text-sm font-semibold text-emerald-200/80">
                            personas
                          </span>
                        </div>
                      </div>
                    ) : null}

                    {activeEvent.show_list_count ? (
                      <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10 p-4 text-fuchsia-300 shadow-[0_0_25px_rgba(217,70,239,0.08)]">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-fuchsia-200/70">
                          En lista
                        </p>
                        <div className="mt-2 flex items-end gap-2">
                          <span className="text-3xl font-black">
                            {stats.listCount}
                          </span>
                          <span className="pb-1 text-sm font-semibold text-fuchsia-200/80">
                            anotados
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[28px] border border-violet-400/20 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.22),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6 shadow-[0_0_60px_rgba(168,85,247,0.14)]">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.12))]" />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
              Tus créditos
            </p>
            <div className="mt-2 text-5xl font-black tracking-tight text-white">
              {balance.toLocaleString("es-AR")}
            </div>
            <p className="mt-2 max-w-sm text-sm text-white/60">
              Sumás créditos al ingresar a eventos y luego podés canjearlos.
            </p>
          </div>

          <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-violet-400/20 bg-black/20 text-violet-300 sm:flex">
            <Trophy className="h-6 w-6" />
          </div>
        </div>
      </section>

      <section className="grid gap-3">
        <ActionCard
          href="/dashboard/puntos"
          icon={Gift}
          title="Ver recompensas"
          subtitle="Canjear premios con tus créditos"
        />

        <ActionCard
          href="/dashboard/puntos/movimientos"
          icon={Clock3}
          title="Ver movimientos"
          subtitle="Historial de sumas y canjes"
        />

        <ActionCard
          href="/dashboard/puntos"
          icon={QrCode}
          title="Mis canjes / QR"
          subtitle="Ver QR pendientes para mostrar"
        />
      </section>

      {activeEvent ? (
        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-2 text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-fuchsia-300">
              <CalendarDays className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold">Detalle del evento</h3>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                Nombre
              </p>
              <p className="mt-2 font-semibold text-white/90">
                {activeEvent.name}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                Fecha
              </p>
              <p className="mt-2 font-semibold text-white/90">
                {formatDate(activeEvent.event_date)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                Listas hasta
              </p>
              <p className="mt-2 font-semibold text-white/90">
                {formatDate(activeEvent.registration_until)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                QR entrada hasta
              </p>
              <p className="mt-2 font-semibold text-white/90">
                {formatDate(activeEvent.qr_entry_until)}
              </p>
            </div>

            {activeEvent.show_entry_count ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/70">
                  Ingresaron
                </p>
                <p className="mt-2 text-xl font-black text-emerald-300">
                  {stats.entryCount}
                </p>
              </div>
            ) : null}

            {activeEvent.show_list_count ? (
              <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-fuchsia-200/70">
                  En lista
                </p>
                <p className="mt-2 text-xl font-black text-fuchsia-300">
                  {stats.listCount}
                </p>
              </div>
            ) : null}
          </div>

          {(activeEvent.show_entry_count || activeEvent.show_list_count) && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
              <Flame className="h-4 w-4" />
              Números actualizados en vivo, sin recargar la página.
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}