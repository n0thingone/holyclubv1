"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  CalendarDays,
  Clock3,
  Lock,
  QrCode,
  ScanLine,
  Trophy,
  Users,
  Crown,
  Home,
  Gift,
  ArrowLeftRight,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Shield,
  Zap,
  Eye,
  EyeOff,
} from "lucide-react";

type EventRow = {
  id: string;
  name: string;
  event_date: string | null;
  event_end_at: string | null;
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
  listCount: number;
  entryCount: number;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleString("es-AR");
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

function getEventProgress(
  start?: string | null,
  end?: string | null,
  nowTs?: number
) {
  if (!start || !end) {
    return {
      percent: null as number | null,
      label: "Sin hora de fin",
    };
  }

  const now = nowTs ?? Date.now();
  const startTs = new Date(start).getTime();
  const endTs = new Date(end).getTime();

  if (Number.isNaN(startTs) || Number.isNaN(endTs) || endTs <= startTs) {
    return {
      percent: null as number | null,
      label: "Duración inválida",
    };
  }

  if (now <= startTs) {
    return {
      percent: 0,
      label: "AÚN NO COMENZÓ",
    };
  }

  if (now >= endTs) {
    return {
      percent: 100,
      label: "FINALIZADO",
    };
  }

  const percent = Math.max(
    0,
    Math.min(100, ((now - startTs) / (endTs - startTs)) * 100)
  );

  return {
    percent,
    label: `PROGRESO ${Math.round(percent)}%`,
  };
}

function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] shadow-[0_10px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  title,
  subtitle,
  iconClassName,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  iconClassName?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-[22px] border border-white/10 bg-white/[0.04] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-fuchsia-500/30 hover:bg-white/[0.07] hover:shadow-[0_0_30px_rgba(217,70,239,0.10)]"
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-white/85 ${iconClassName || ""}`}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0">
        <div className="font-semibold text-white">{title}</div>
        <div className="text-sm text-white/50">{subtitle}</div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [closingEvent, setClosingEvent] = useState(false);
  const [closingLists, setClosingLists] = useState(false);
  const [updatingVisibility, setUpdatingVisibility] = useState(false);

  const [activeEvent, setActiveEvent] = useState<EventRow | null>(null);
  const [stats, setStats] = useState<StatsState>({
    listCount: 0,
    entryCount: 0,
  });

  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventEndAt, setEventEndAt] = useState("");
  const [registrationUntil, setRegistrationUntil] = useState("");
  const [qrEntryUntil, setQrEntryUntil] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const role = profile?.role;
  const isAdmin = role === "admin" || role === "bar" || role === "cashier";

  useEffect(() => {
    if (!authLoading && profile && !isAdmin) {
      router.replace("/dashboard/puntos/home");
    }
  }, [authLoading, profile, isAdmin, router]);

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
      console.error("loadStats error:", err);
      setStats({
        listCount: 0,
        entryCount: 0,
      });
    }
  }

  async function loadActiveEvent() {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("events")
      .select(
        "id, name, event_date, event_end_at, status, registration_until, qr_entry_until, created_by, created_at, closed_at, show_entry_count, show_list_count"
      )
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      setError(error.message);
      setActiveEvent(null);
      setStats({
        listCount: 0,
        entryCount: 0,
      });
      setLoading(false);
      return;
    }

    const eventData = data as EventRow | null;

    setActiveEvent(eventData ?? null);

    if (eventData?.id) {
      await loadStats(eventData.id);
    } else {
      setStats({
        listCount: 0,
        entryCount: 0,
      });
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!authLoading && profile && isAdmin) {
      void loadActiveEvent();
    }
  }, [authLoading, profile, isAdmin]);

  useEffect(() => {
    if (!activeEvent?.id || !profile || !isAdmin) return;

    const interval = setInterval(() => {
      void loadStats(activeEvent.id);
    }, 8000);

    return () => clearInterval(interval);
  }, [activeEvent?.id, profile, isAdmin]);

  const progressData = useMemo(() => {
    if (!activeEvent) {
      return {
        percent: null as number | null,
        label: "Sin evento activo",
      };
    }

    return getEventProgress(activeEvent.event_date, activeEvent.event_end_at, now);
  }, [activeEvent, now]);

  const heroData = useMemo(() => {
    if (!activeEvent) {
      return {
        title: "SIN EVENTO ACTIVO",
        subtitle: "Creá un evento para activarlo",
        badge: "ESPERANDO EVENTO",
        badgeStyle: "border-white/15 bg-white/5 text-white/70",
        extra1: "Fecha del evento: —",
        extra2: "Listas hasta: —",
      };
    }

    if (activeEvent.status === "closed") {
      return {
        title: activeEvent.name,
        subtitle: "🔴 EVENTO FINALIZADO",
        badge: "FINALIZADO",
        badgeStyle: "border-red-400/30 bg-red-400/10 text-red-300",
        extra1: `Fecha del evento: ${formatDate(activeEvent.event_date)}`,
        extra2: `Listas hasta: ${formatDate(activeEvent.registration_until)}`,
      };
    }

    const eventTs = activeEvent.event_date
      ? new Date(activeEvent.event_date).getTime()
      : null;

    const regTs = activeEvent.registration_until
      ? new Date(activeEvent.registration_until).getTime()
      : null;

    const endTs = activeEvent.event_end_at
      ? new Date(activeEvent.event_end_at).getTime()
      : null;

    if (eventTs && now < eventTs) {
      const diff = eventTs - now;
      const countdownText = formatCountdown(diff);

      return {
        title: activeEvent.name,
        subtitle:
          countdownText === "🔥 POR COMENZAR"
            ? "🔥 POR COMENZAR"
            : `⏳ INICIA EN ${countdownText}`,
        badge: regTs && now < regTs ? "LISTAS ABIERTAS" : "LISTAS CERRADAS",
        badgeStyle:
          regTs && now < regTs
            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
            : "border-amber-400/30 bg-amber-400/10 text-amber-300",
        extra1: `Fecha del evento: ${formatDate(activeEvent.event_date)}`,
        extra2: `Listas hasta: ${formatDate(activeEvent.registration_until)}`,
      };
    }

    if (endTs && now > endTs) {
      return {
        title: activeEvent.name,
        subtitle: "🔴 EVENTO FINALIZADO",
        badge: "FINALIZADO",
        badgeStyle: "border-red-400/30 bg-red-400/10 text-red-300",
        extra1: `Fecha del evento: ${formatDate(activeEvent.event_date)}`,
        extra2: `Listas hasta: ${formatDate(activeEvent.registration_until)}`,
      };
    }

    if (regTs && now < regTs) {
      return {
        title: activeEvent.name,
        subtitle: "EN VIVO",
        badge: "LISTAS ABIERTAS",
        badgeStyle:
          "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
        extra1: `Fecha del evento: ${formatDate(activeEvent.event_date)}`,
        extra2: `Listas hasta: ${formatDate(activeEvent.registration_until)}`,
      };
    }

    return {
      title: activeEvent.name,
      subtitle: "EN VIVO",
      badge: "LISTAS CERRADAS",
      badgeStyle: "border-amber-400/30 bg-amber-400/10 text-amber-300",
      extra1: `Fecha del evento: ${formatDate(activeEvent.event_date)}`,
      extra2: `Listas hasta: ${formatDate(activeEvent.registration_until)}`,
    };
  }, [activeEvent, now]);

  async function toggleEventVisibility(
    field: "show_entry_count" | "show_list_count"
  ) {
    if (!activeEvent) return;

    setUpdatingVisibility(true);
    setMessage(null);
    setError(null);

    const nextValue = !activeEvent[field];

    const { error } = await (supabase as any)
      .from("events")
      .update({ [field]: nextValue })
      .eq("id", activeEvent.id);

    if (error) {
      setError(error.message);
      setUpdatingVisibility(false);
      return;
    }

    setActiveEvent((prev) =>
      prev
        ? {
            ...prev,
            [field]: nextValue,
          }
        : prev
    );

    setMessage(
      field === "show_entry_count"
        ? nextValue
          ? "Ahora los clientes pueden ver los ingresos."
          : "Los ingresos quedaron ocultos para clientes."
        : nextValue
          ? "Ahora los clientes pueden ver la cantidad en lista."
          : "La cantidad en lista quedó oculta para clientes."
    );

    setUpdatingVisibility(false);
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setMessage(null);
    setError(null);

    if (!name.trim()) {
      setError("Poné un nombre para el evento.");
      setSaving(false);
      return;
    }

    if (!eventDate) {
      setError("Completá la fecha del evento.");
      setSaving(false);
      return;
    }

    if (activeEvent) {
      setError("Ya hay un evento activo. Cerralo antes de crear otro.");
      setSaving(false);
      return;
    }

    const payload = {
      name: name.trim(),
      event_date: new Date(eventDate).toISOString(),
      event_end_at: eventEndAt ? new Date(eventEndAt).toISOString() : null,
      status: "active",
      registration_until: registrationUntil
        ? new Date(registrationUntil).toISOString()
        : new Date(eventDate).toISOString(),
      qr_entry_until: qrEntryUntil
        ? new Date(qrEntryUntil).toISOString()
        : new Date(eventDate).toISOString(),
      show_entry_count: false,
      show_list_count: false,
    };

    const { error } = await (supabase as any).from("events").insert(payload);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setMessage("Evento creado y activado correctamente.");
    setName("");
    setEventDate("");
    setEventEndAt("");
    setRegistrationUntil("");
    setQrEntryUntil("");

    await loadActiveEvent();
    setSaving(false);
  }

  async function handleCloseEvent() {
    if (!activeEvent) return;

    setClosingEvent(true);
    setMessage(null);
    setError(null);

    const { error } = await (supabase as any)
      .from("events")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
      })
      .eq("id", activeEvent.id);

    if (error) {
      setError(error.message);
      setClosingEvent(false);
      return;
    }

    setMessage("Evento cerrado correctamente.");
    await loadActiveEvent();
    setClosingEvent(false);
  }

  async function handleCloseLists() {
    if (!activeEvent) return;

    setClosingLists(true);
    setMessage(null);
    setError(null);

    const nowIso = new Date().toISOString();

    const { error } = await (supabase as any)
      .from("events")
      .update({ registration_until: nowIso })
      .eq("id", activeEvent.id);

    if (error) {
      setError(error.message);
      setClosingLists(false);
      return;
    }

    setMessage("Registro de listas cerrado.");
    await loadActiveEvent();
    setClosingLists(false);
  }

  if (authLoading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-fuchsia-500/30 border-t-fuchsia-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-6 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="relative overflow-hidden rounded-[32px] border border-fuchsia-500/20 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.18),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 shadow-[0_0_60px_rgba(168,85,247,0.10)] sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.15))]" />

          <div className="relative flex items-start justify-between gap-6">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300">
                <Sparkles className="h-3.5 w-3.5" />
                Evento activo
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
                {heroData.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-lg font-semibold text-white/90 sm:text-2xl">
                {loading ? (
                  <span>Cargando...</span>
                ) : heroData.subtitle === "EN VIVO" ? (
                  <div className="flex items-center gap-3 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-emerald-300">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-3 w-3 animate-pulse rounded-full bg-emerald-400" />
                    </span>
                    <span>🟢 EN VIVO</span>
                  </div>
                ) : (
                  <span>{heroData.subtitle}</span>
                )}
              </div>

              <div
                className={`mt-5 inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold ${heroData.badgeStyle}`}
              >
                {heroData.badge}
              </div>

              <div className="mt-6 grid gap-3 text-sm text-white/70 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  {heroData.extra1}
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  {heroData.extra2}
                </div>

                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-wide text-white/40">
                      Ingresos
                    </p>

                    <button
                      type="button"
                      onClick={() => toggleEventVisibility("show_entry_count")}
                      disabled={!activeEvent || updatingVisibility}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/70 transition hover:bg-white/10 disabled:opacity-50"
                    >
                      {activeEvent?.show_entry_count ? (
                        <>
                          <Eye className="h-3.5 w-3.5" />
                          Visible
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3.5 w-3.5" />
                          Oculto
                        </>
                      )}
                    </button>
                  </div>

                  <p className="mt-2 text-lg font-extrabold text-cyan-300">
                    👥 {stats.entryCount}
                  </p>

                  <p className="mt-1 text-xs text-white/45">
                    Cliente: {activeEvent?.show_entry_count ? "lo ve" : "no lo ve"}
                  </p>
                </div>

                <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/5 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-wide text-white/40">
                      En lista
                    </p>

                    <button
                      type="button"
                      onClick={() => toggleEventVisibility("show_list_count")}
                      disabled={!activeEvent || updatingVisibility}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/70 transition hover:bg-white/10 disabled:opacity-50"
                    >
                      {activeEvent?.show_list_count ? (
                        <>
                          <Eye className="h-3.5 w-3.5" />
                          Visible
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3.5 w-3.5" />
                          Oculto
                        </>
                      )}
                    </button>
                  </div>

                  <p className="mt-2 text-lg font-extrabold text-fuchsia-300">
                    📝 {stats.listCount}
                  </p>

                  <p className="mt-1 text-xs text-white/45">
                    Cliente: {activeEvent?.show_list_count ? "lo ve" : "no lo ve"}
                  </p>
                </div>

                <div className="rounded-2xl border border-violet-400/20 bg-violet-400/5 px-4 py-3 sm:col-span-2 lg:col-span-4">
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <p className="text-xs uppercase tracking-wide text-white/40">
                      Barra de progreso del evento
                    </p>
                    <p className="text-xs font-semibold text-violet-300">
                      {progressData.label}
                    </p>
                  </div>

                  <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-violet-400 to-cyan-400 transition-all duration-700"
                      style={{
                        width:
                          progressData.percent === null
                            ? "0%"
                            : `${progressData.percent}%`,
                      }}
                    />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-white/45">
                    <span>Inicio: {formatDate(activeEvent?.event_date)}</span>
                    <span>Fin: {formatDate(activeEvent?.event_end_at)}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 sm:col-span-2 lg:col-span-4">
                  QR entrada hasta:{" "}
                  <span className="font-semibold text-white/90">
                    {activeEvent?.qr_entry_until
                      ? formatDate(activeEvent.qr_entry_until)
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-[28px] border border-fuchsia-400/20 bg-black/20 text-fuchsia-300 lg:flex">
              <Zap className="h-10 w-10" />
            </div>
          </div>
        </section>

        {message ? (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-2">
          <SectionCard className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-fuchsia-300">
                <CalendarDays className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-semibold text-white">Evento activo</h2>
            </div>

            {loading ? (
              <p className="text-sm text-white/60">Cargando evento...</p>
            ) : activeEvent ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-white/40">
                    Nombre
                  </p>
                  <p className="mt-1 text-xl font-extrabold text-white">
                    {activeEvent.name}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-white/40">
                      Fecha del evento
                    </p>
                    <p className="mt-1 text-sm text-white/80">
                      {formatDate(activeEvent.event_date)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-white/40">
                      Hora de fin
                    </p>
                    <p className="mt-1 text-sm text-white/80">
                      {formatDate(activeEvent.event_end_at)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-white/40">
                      Listas abiertas hasta
                    </p>
                    <p className="mt-1 text-sm text-white/80">
                      {formatDate(activeEvent.registration_until)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-white/40">
                      QR entrada válido hasta
                    </p>
                    <p className="mt-1 text-sm text-white/80">
                      {formatDate(activeEvent.qr_entry_until)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 pt-2">
                  <button
                    onClick={handleCloseLists}
                    disabled={closingLists}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
                  >
                    <Lock className="h-4 w-4" />
                    {closingLists
                      ? "Cerrando listas..."
                      : "Cerrar registro de listas"}
                  </button>

                  <button
                    onClick={handleCloseEvent}
                    disabled={closingEvent}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <Clock3 className="h-4 w-4" />
                    {closingEvent ? "Cerrando evento..." : "Cerrar evento"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/60">
                No hay evento activo.
              </div>
            )}
          </SectionCard>

          <SectionCard className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-fuchsia-300">
                <PlusCircle className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-semibold text-white">Crear evento</h2>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-white/70">
                  Nombre del evento
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: HOLY NIGHT"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none transition focus:border-fuchsia-500 focus:bg-black/40"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-white/70">
                  Fecha y hora de inicio
                </label>
                <input
                  type="datetime-local"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none transition focus:border-fuchsia-500 focus:bg-black/40"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-white/70">
                  Fecha y hora de fin
                </label>
                <input
                  type="datetime-local"
                  value={eventEndAt}
                  onChange={(e) => setEventEndAt(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none transition focus:border-fuchsia-500 focus:bg-black/40"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-white/70">
                  Registro de listas hasta
                </label>
                <input
                  type="datetime-local"
                  value={registrationUntil}
                  onChange={(e) => setRegistrationUntil(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none transition focus:border-fuchsia-500 focus:bg-black/40"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-white/70">
                  QR entrada válido hasta
                </label>
                <input
                  type="datetime-local"
                  value={qrEntryUntil}
                  onChange={(e) => setQrEntryUntil(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none transition focus:border-fuchsia-500 focus:bg-black/40"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-fuchsia-600 px-4 py-3 font-semibold text-white shadow-[0_0_20px_rgba(217,70,239,0.22)] transition hover:bg-fuchsia-500 disabled:opacity-50"
              >
                {saving ? "Creando evento..." : "Crear evento"}
              </button>
            </form>
          </SectionCard>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <SectionCard className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-fuchsia-300">
                <Shield className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-semibold text-white">
                Herramientas admin
              </h2>
            </div>

            <div className="grid gap-3">
              <QuickLink
                href="/dashboard/scanner"
                icon={ScanLine}
                title="Scanner QR"
                subtitle="Escanear ingresos"
                iconClassName="text-yellow-300"
              />

              <QuickLink
                href="/dashboard/ranking"
                icon={Trophy}
                title="Ranking RRPP"
                subtitle="Ver ranking de promotores"
                iconClassName="text-amber-300"
              />

              <QuickLink
                href="/dashboard/rrpp-panel"
                icon={Users}
                title="Vista RRPP"
                subtitle="Panel de RRPP"
                iconClassName="text-cyan-300"
              />

              <QuickLink
                href="/dashboard/gold"
                icon={Crown}
                title="QR Gold"
                subtitle="Accesos especiales"
                iconClassName="text-orange-300"
              />

              <QuickLink
                href="/dashboard/admin/puntos"
                icon={QrCode}
                title="Administrar créditos"
                subtitle="Sumar y revisar puntos"
                iconClassName="text-fuchsia-300"
              />
            </div>
          </SectionCard>

          <SectionCard className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-violet-300">
                <Home className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-semibold text-white">
                Vistas cliente
              </h2>
            </div>

            <div className="grid gap-3">
              <QuickLink
                href="/dashboard/puntos/home"
                icon={Home}
                title="Cliente · HOME"
                subtitle="Vista principal del cliente"
                iconClassName="text-violet-300"
              />

              <QuickLink
                href="/dashboard/puntos"
                icon={Gift}
                title="Cliente · CANJEA"
                subtitle="Canjes y recompensas"
                iconClassName="text-fuchsia-300"
              />

              <QuickLink
                href="/dashboard/puntos/movimientos"
                icon={ArrowLeftRight}
                title="Cliente · MOVIMIENTOS"
                subtitle="Historial de sumas y canjes"
                iconClassName="text-sky-300"
              />

              <QuickLink
                href="/dashboard/puntos/beneficios"
                icon={Sparkles}
                title="Cliente · BENEFICIOS"
                subtitle="Ventajas y perks"
                iconClassName="text-emerald-300"
              />
            </div>
          </SectionCard>
        </section>
      </div>
    </main>
  );
}