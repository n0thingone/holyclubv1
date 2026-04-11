"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardShell from "@/components/navigation/DashboardShell";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  CalendarDays,
  Clock3,
  Plus,
  Power,
  Lock,
  RefreshCw,
  Sparkles,
} from "lucide-react";

type EventRow = {
  id: string;
  name: string | null;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  registration_until: string | null;
  qr_entry_until: string | null;
  event_end_at: string | null;
  is_active: boolean | null;
  is_closed: boolean | null;
  status: string | null;
  created_at: string | null;
  closed_at?: string | null;
};

type FormState = {
  name: string;
  event_date: string;
  start_time: string;
  end_time: string;
  registration_until: string;
  qr_entry_until: string;
};

const initialForm: FormState = {
  name: "",
  event_date: "",
  start_time: "",
  end_time: "",
  registration_until: "",
  qr_entry_until: "",
};

export default function AdminEventosPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [userRole, setUserRole] = useState("");

  const canManage =
    userRole === "admin" || userRole === "cashier" || userRole === "cajero";

  const isEventActive = (event: EventRow) =>
    event.status === "active" || (!!event.is_active && !event.is_closed);

  const isEventClosed = (event: EventRow) =>
    event.status === "closed" || !!event.is_closed;

  const activeEvent = events.find((event) => isEventActive(event)) ?? null;

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const aIsActive = isEventActive(a);
      const bIsActive = isEventActive(b);

      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;

      const aCreatedAt = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bCreatedAt = b.created_at ? new Date(b.created_at).getTime() : 0;

      return bCreatedAt - aCreatedAt;
    });
  }, [events]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      setErrorMessage(userError.message || "No se pudo obtener el usuario.");
      setLoading(false);
      return;
    }

    if (!user) {
      setErrorMessage("No hay sesión activa.");
      setLoading(false);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      setErrorMessage(profileError.message || "No se pudo cargar el perfil.");
      setLoading(false);
      return;
    }

    setUserRole(String(profileData?.role || "").toLowerCase());

    const { data, error } = await supabase
      .from("events")
      .select(
        "id, name, event_date, start_time, end_time, registration_until, qr_entry_until, event_end_at, is_active, is_closed, status, created_at, closed_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(
        error.message ||
          "No se pudieron cargar los eventos. Revisá la tabla events."
      );
      setLoading(false);
      return;
    }

    setEvents((data || []) as EventRow[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function formatDate(date: string | null) {
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
  }

  function formatTime(time: string | null) {
    if (!time) return "--:--";
    return String(time).slice(0, 5);
  }

  function formatDateTime(dateTime: string | null) {
    if (!dateTime) return "--:--";
    try {
      return new Date(dateTime).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateTime;
    }
  }

  function buildDateTime(date: string, time: string) {
    if (!date || !time) return null;
    return new Date(`${date}T${time}:00`).toISOString();
  }

  function resetMessages() {
    setMessage("");
    setErrorMessage("");
  }

  async function handleCreateEvent() {
    resetMessages();

    if (!form.name.trim()) {
      setErrorMessage("Poné un nombre para el evento.");
      return;
    }

    if (!form.event_date) {
      setErrorMessage("Elegí la fecha del evento.");
      return;
    }

    if (!form.start_time) {
      setErrorMessage("Elegí la hora de inicio.");
      return;
    }

    if (!form.end_time) {
      setErrorMessage("Elegí la hora de cierre.");
      return;
    }

    if (!form.registration_until) {
      setErrorMessage("Elegí hasta qué hora se permiten registros.");
      return;
    }

    if (!form.qr_entry_until) {
      setErrorMessage("Elegí hasta qué hora vale el QR.");
      return;
    }

    setSaving(true);

    const eventEndAt = buildDateTime(form.event_date, form.end_time);
    const registrationUntil = buildDateTime(
      form.event_date,
      form.registration_until
    );
    const qrEntryUntil = buildDateTime(form.event_date, form.qr_entry_until);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      name: form.name.trim(),
      event_date: form.event_date,
      start_time: form.start_time,
      end_time: form.end_time,
      registration_until: registrationUntil,
      qr_entry_until: qrEntryUntil,
      event_end_at: eventEndAt,
      is_active: false,
      is_closed: false,
      status: "draft",
      created_by: user?.id ?? null,
    };

    const { error } = await supabase.from("events").insert(payload);

    if (error) {
      setErrorMessage(
        error.message || "No se pudo crear el evento. Revisá la tabla events."
      );
      setSaving(false);
      return;
    }

    setMessage("Evento creado correctamente.");
    setForm(initialForm);
    await loadEvents();
    setSaving(false);
  }

  async function handleActivateEvent(eventId: string) {
    resetMessages();
    setSaving(true);

    const { error: deactivateError } = await supabase
      .from("events")
      .update({
        is_active: false,
        status: "inactive",
      })
      .or("is_active.eq.true,status.eq.active");

    if (deactivateError) {
      setErrorMessage(
        deactivateError.message || "No se pudo desactivar el evento anterior."
      );
      setSaving(false);
      return;
    }

    const { error: activateError } = await supabase
      .from("events")
      .update({
        is_active: true,
        is_closed: false,
        closed_at: null,
        status: "active",
      })
      .eq("id", eventId);

    if (activateError) {
      setErrorMessage(
        activateError.message || "No se pudo activar el evento."
      );
      setSaving(false);
      return;
    }

    setMessage("Evento activado correctamente.");
    await loadEvents();
    setSaving(false);
  }

  async function handleCloseEvent(eventId: string) {
    resetMessages();
    setSaving(true);

    const { error } = await supabase
      .from("events")
      .update({
        is_active: false,
        is_closed: true,
        closed_at: new Date().toISOString(),
        status: "closed",
      })
      .eq("id", eventId);

    if (error) {
      setErrorMessage(error.message || "No se pudo cerrar el evento.");
      setSaving(false);
      return;
    }

    setMessage("Evento cerrado correctamente.");
    await loadEvents();
    setSaving(false);
  }

  if (loading) {
    return (
      <DashboardShell title="ADMIN · EVENTOS">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/70">
            Cargando eventos...
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (!canManage) {
    return (
      <DashboardShell title="ADMIN · EVENTOS">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
            No tenés permisos para entrar a esta pantalla.
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="ADMIN · EVENTOS">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">
              Holy Admin
            </div>
            <h1 className="mt-1 text-2xl font-black text-white">
              Gestión de eventos
            </h1>
            <p className="mt-1 text-sm text-white/55">
              Creá, activá y cerrá eventos desde un solo lugar.
            </p>
          </div>

          <button
            onClick={loadEvents}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4" />
            Recargar
          </button>
        </div>

        {!!message && (
          <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {message}
          </div>
        )}

        {!!errorMessage && (
          <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_0_40px_rgba(0,0,0,0.25)]">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-fuchsia-300" />
              <h2 className="text-lg font-black text-white">Crear evento</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                  Nombre
                </span>
                <input
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  placeholder="Ej: HOLY Viernes"
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition placeholder:text-white/25 focus:border-fuchsia-400/50"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                  Fecha
                </span>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    type="date"
                    value={form.event_date}
                    onChange={(e) => updateForm("event_date", e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 py-3 pl-11 pr-4 text-white outline-none transition focus:border-fuchsia-400/50"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                  Hora inicio
                </span>
                <div className="relative">
                  <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => updateForm("start_time", e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 py-3 pl-11 pr-4 text-white outline-none transition focus:border-fuchsia-400/50"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                  Hora cierre
                </span>
                <div className="relative">
                  <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => updateForm("end_time", e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 py-3 pl-11 pr-4 text-white outline-none transition focus:border-fuchsia-400/50"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                  Registros hasta
                </span>
                <div className="relative">
                  <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    type="time"
                    value={form.registration_until}
                    onChange={(e) =>
                      updateForm("registration_until", e.target.value)
                    }
                    className="w-full rounded-2xl border border-white/10 bg-black/40 py-3 pl-11 pr-4 text-white outline-none transition focus:border-fuchsia-400/50"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                  QR válido hasta
                </span>
                <div className="relative">
                  <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    type="time"
                    value={form.qr_entry_until}
                    onChange={(e) => updateForm("qr_entry_until", e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 py-3 pl-11 pr-4 text-white outline-none transition focus:border-fuchsia-400/50"
                  />
                </div>
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={handleCreateEvent}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-fuchsia-500 px-5 py-3 text-sm font-black text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                {saving ? "Guardando..." : "Crear evento"}
              </button>

              <button
                onClick={() => setForm(initialForm)}
                disabled={saving}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white/80 transition hover:bg-white/10 disabled:opacity-60"
              >
                Limpiar
              </button>
            </div>
          </section>

          <section className="rounded-[28px] border border-fuchsia-400/20 bg-fuchsia-500/10 p-5 shadow-[0_0_40px_rgba(217,70,239,0.12)]">
            <div className="mb-4 flex items-center gap-2">
              <Power className="h-5 w-5 text-fuchsia-200" />
              <h2 className="text-lg font-black text-white">Evento activo</h2>
            </div>

            {activeEvent ? (
              <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-300">
                  Activo ahora
                </div>

                <div className="mt-2 text-2xl font-black text-white">
                  {activeEvent.name || "Sin nombre"}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">
                      Fecha
                    </div>
                    <div className="mt-1 text-sm font-bold text-white">
                      {formatDate(activeEvent.event_date)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">
                      Horario
                    </div>
                    <div className="mt-1 text-sm font-bold text-white">
                      {formatTime(activeEvent.start_time)} ·{" "}
                      {formatTime(activeEvent.end_time)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">
                      Registros hasta
                    </div>
                    <div className="mt-1 text-sm font-bold text-white">
                      {formatDateTime(activeEvent.registration_until)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">
                      QR válido hasta
                    </div>
                    <div className="mt-1 text-sm font-bold text-white">
                      {formatDateTime(activeEvent.qr_entry_until)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleCloseEvent(activeEvent.id)}
                  disabled={saving}
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-red-500 px-5 py-3 text-sm font-black text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Lock className="h-4 w-4" />
                  {saving ? "Procesando..." : "Cerrar evento"}
                </button>
              </div>
            ) : (
              <div className="rounded-3xl border border-white/10 bg-black/30 p-5 text-sm text-white/65">
                No hay ningún evento activo en este momento.
              </div>
            )}
          </section>
        </div>

        <section className="mt-6 rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_0_40px_rgba(0,0,0,0.25)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white">
                Eventos recientes
              </h2>
              <p className="mt-1 text-sm text-white/50">
                Activo primero, después los más nuevos.
              </p>
            </div>

            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/60">
              {sortedEvents.length} total
            </div>
          </div>

          {sortedEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center text-sm text-white/55">
              Todavía no hay eventos cargados.
            </div>
          ) : (
            <div className="grid gap-3">
              {sortedEvents.map((event) => {
                const isActive = isEventActive(event);
                const isClosed = isEventClosed(event);

                return (
                  <div
                    key={event.id}
                    className="rounded-3xl border border-white/10 bg-black/25 p-4"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-black text-white">
                            {event.name || "Sin nombre"}
                          </h3>

                          {isActive && (
                            <span className="rounded-full border border-emerald-400/20 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200">
                              Activo
                            </span>
                          )}

                          {isClosed && (
                            <span className="rounded-full border border-red-400/20 bg-red-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-red-200">
                              Cerrado
                            </span>
                          )}

                          {!isActive && !isClosed && (
                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/55">
                              Inactivo
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-3 text-sm text-white/60">
                          <span>📅 {formatDate(event.event_date)}</span>
                          <span>
                            🕒 {formatTime(event.start_time)} ·{" "}
                            {formatTime(event.end_time)}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-col gap-1 text-xs text-white/45">
                          <span>
                            Registros hasta: {formatDateTime(event.registration_until)}
                          </span>
                          <span>
                            QR válido hasta: {formatDateTime(event.qr_entry_until)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {!isActive && !isClosed && (
                          <button
                            onClick={() => handleActivateEvent(event.id)}
                            disabled={saving}
                            className="rounded-2xl bg-fuchsia-500 px-4 py-2.5 text-sm font-black text-white transition hover:bg-fuchsia-400 disabled:opacity-60"
                          >
                            Activar
                          </button>
                        )}

                        {isActive && (
                          <button
                            onClick={() => handleCloseEvent(event.id)}
                            disabled={saving}
                            className="rounded-2xl bg-red-500 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-400 disabled:opacity-60"
                          >
                            Cerrar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}