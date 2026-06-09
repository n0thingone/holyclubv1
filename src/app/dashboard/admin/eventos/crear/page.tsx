"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardShell from "@/components/navigation/DashboardShell";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  CalendarDays,
  Clock3,
  Plus,
  Trash2,
  Ticket,
  Power,
  Lock,
  RefreshCw,
  Sparkles,
  Image as ImageIcon,
  X,
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
  event_image_url?: string | null;
};

type TicketBatchForm = {
  id: string;
  name: string;
  price: string;
  rrpp_commission: string;
  stock: string;
};

type FormState = {
  name: string;
  event_start: string;
  event_end: string;
  registration_until: string;
  qr_entry_until: string;
  tickets_enabled: boolean;
  ticket_batches: TicketBatchForm[];
};

function createEmptyBatch(order = 1): TicketBatchForm {
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
    name: `Anticipada ${order}° tanda`,
    price: "",
    rrpp_commission: "",
    stock: "",
  };
}

function makeInitialForm(): FormState {
  return {
    name: "",
    event_start: "",
    event_end: "",
    registration_until: "",
    qr_entry_until: "",
    tickets_enabled: false,
    ticket_batches: [createEmptyBatch(1)],
  };
}

const initialForm: FormState = makeInitialForm();

export default function AdminEventosPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [eventImageFile, setEventImageFile] = useState<File | null>(null);
  const [eventImagePreview, setEventImagePreview] = useState<string>("");
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
      .maybeSingle<{ role: string | null }>();

    if (profileError) {
      setErrorMessage(profileError.message || "No se pudo cargar el perfil.");
      setLoading(false);
      return;
    }

    setUserRole(String(profileData?.role || "").toLowerCase());

    const { data, error } = await supabase
      .from("events")
      .select(
        "id, name, event_date, start_time, end_time, registration_until, qr_entry_until, event_end_at, event_image_url, is_active, is_closed, status, created_at, closed_at"
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

  function updateTicketBatch(
    batchId: string,
    key: keyof Omit<TicketBatchForm, "id">,
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      ticket_batches: prev.ticket_batches.map((batch) =>
        batch.id === batchId ? { ...batch, [key]: value } : batch
      ),
    }));
  }

  function addTicketBatch() {
    setForm((prev) => ({
      ...prev,
      ticket_batches: [
        ...prev.ticket_batches,
        createEmptyBatch(prev.ticket_batches.length + 1),
      ],
    }));
  }

  function removeTicketBatch(batchId: string) {
    setForm((prev) => {
      if (prev.ticket_batches.length <= 1) return prev;

      return {
        ...prev,
        ticket_batches: prev.ticket_batches.filter((batch) => batch.id !== batchId),
      };
    });
  }

  function parseMoney(value: string) {
    const normalized = value.replace(/[^0-9]/g, "");
    if (!normalized) return 0;
    return Number(normalized);
  }

  function parseStock(value: string) {
    const normalized = value.replace(/[^0-9]/g, "");
    if (!normalized) return null;
    return Number(normalized);
  }

  function toIso(value: string) {
    return new Date(value).toISOString();
  }

  function getDateOnly(value: string) {
    if (!value) return null;
    return value.slice(0, 10);
  }

  function getTimeOnly(value: string) {
    if (!value) return null;
    return value.slice(11, 16);
  }

  function formatDate(date: string | null) {
    if (!date) return "Sin fecha";

    try {
      if (date.includes("T")) {
        return new Date(date).toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      }

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

  function resetMessages() {
    setMessage("");
    setErrorMessage("");
  }


  function handleImageChange(file: File | null) {
    setEventImageFile(file);

    if (!file) {
      setEventImagePreview("");
      return;
    }

    setEventImagePreview(URL.createObjectURL(file));
  }

  async function uploadEventImage() {
    if (!eventImageFile) return null;

    const extension = eventImageFile.name.split(".").pop() || "jpg";
    const safeName = form.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const filePath = `events/${Date.now()}-${safeName || "evento"}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("event-images")
      .upload(filePath, eventImageFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(
        uploadError.message ||
          "No se pudo subir la imagen. Revisá el bucket event-images."
      );
    }

    const { data } = supabase.storage
      .from("event-images")
      .getPublicUrl(filePath);

    return data.publicUrl || null;
  }

  async function handleCreateEvent() {
    resetMessages();

    if (!form.name.trim()) {
      setErrorMessage("Poné un nombre para el evento.");
      return;
    }

    if (!form.event_start) {
      setErrorMessage("Elegí fecha y hora de inicio.");
      return;
    }

    if (!form.event_end) {
      setErrorMessage("Elegí fecha y hora de cierre.");
      return;
    }

    if (!form.registration_until) {
      setErrorMessage("Elegí hasta cuándo se permiten registros.");
      return;
    }

    if (!form.qr_entry_until) {
      setErrorMessage("Elegí hasta cuándo vale el QR de entrada.");
      return;
    }

    const eventStartMs = new Date(form.event_start).getTime();
    const eventEndMs = new Date(form.event_end).getTime();
    const registrationMs = new Date(form.registration_until).getTime();
    const qrMs = new Date(form.qr_entry_until).getTime();

    if (
      Number.isNaN(eventStartMs) ||
      Number.isNaN(eventEndMs) ||
      Number.isNaN(registrationMs) ||
      Number.isNaN(qrMs)
    ) {
      setErrorMessage("Hay una fecha inválida. Revisá los campos.");
      return;
    }

    if (eventEndMs <= eventStartMs) {
      setErrorMessage("El cierre del evento tiene que ser después del inicio.");
      return;
    }

    if (registrationMs <= eventStartMs) {
      setErrorMessage(
        "El cierre de registros tiene que ser después del inicio del evento."
      );
      return;
    }

    if (registrationMs > eventEndMs) {
      setErrorMessage(
        "El cierre de registros no debería ser después del cierre del evento."
      );
      return;
    }

    if (qrMs <= eventStartMs) {
      setErrorMessage(
        "El QR de entrada tiene que seguir válido después del inicio del evento."
      );
      return;
    }

    if (qrMs > eventEndMs) {
      setErrorMessage(
        "El QR de entrada no debería seguir válido después del cierre del evento."
      );
      return;
    }

    if (form.tickets_enabled) {
      if (form.ticket_batches.length === 0) {
        setErrorMessage("Agregá al menos una tanda de anticipadas.");
        return;
      }

     for (let index = 0; index < form.ticket_batches.length; index += 1) {
         const batch = form.ticket_batches[index];
        const price = parseMoney(batch.price);
        const commission = parseMoney(batch.rrpp_commission);
        const stock = parseStock(batch.stock);

        if (!batch.name.trim()) {
          setErrorMessage(`Poné un nombre para la tanda ${index + 1}.`);
          return;
        }

        if (price <= 0) {
          setErrorMessage(`Poné un precio válido para la tanda ${index + 1}.`);
          return;
        }

        if (commission < 0) {
          setErrorMessage(`La comisión de la tanda ${index + 1} no puede ser negativa.`);
          return;
        }

        if (commission >= price) {
          setErrorMessage(
            `La comisión RRPP de la tanda ${index + 1} tiene que ser menor al precio.`
          );
          return;
        }

        if (stock !== null && stock <= 0) {
          setErrorMessage(
            `El stock de la tanda ${index + 1} tiene que ser mayor a 0 o quedar vacío.`
          );
          return;
        }
      }
    }

    setSaving(true);

    let eventImageUrl: string | null = null;

    try {
      eventImageUrl = await uploadEventImage();
    } catch (error: any) {
      setErrorMessage(error?.message || "No se pudo subir la imagen del evento.");
      setSaving(false);
      return;
    }

    const eventStartIso = toIso(form.event_start);
    const eventEndIso = toIso(form.event_end);
    const registrationUntilIso = toIso(form.registration_until);
    const qrEntryUntilIso = toIso(form.qr_entry_until);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      name: form.name.trim(),

      // Mantengo compatibilidad:
      // event_date puede ser timestamp si tu DB lo acepta.
      // start_time/end_time quedan como hora simple para mostrar horarios.
      event_date: eventStartIso,
      start_time: getTimeOnly(form.event_start),
      end_time: getTimeOnly(form.event_end),

      registration_until: registrationUntilIso,
      qr_entry_until: qrEntryUntilIso,
      event_end_at: eventEndIso,
      event_image_url: eventImageUrl,

      is_active: false,
      is_closed: false,
      status: "draft",
      created_by: user?.id ?? null,
    };

    const { data: createdEvent, error } = await (supabase as any)
      .from("events")
      .insert(payload)
      .select("id")
      .single();

    if (error || !createdEvent?.id) {
      setErrorMessage(
        error?.message || "No se pudo crear el evento. Revisá la tabla events."
      );
      setSaving(false);
      return;
    }

    if (form.tickets_enabled) {
      const batchesPayload = form.ticket_batches.map((batch, index) => ({
        event_id: createdEvent.id,
        name: batch.name.trim(),
        batch_order: index + 1,
        price: parseMoney(batch.price),
        rrpp_commission: parseMoney(batch.rrpp_commission),
        stock: parseStock(batch.stock),
        sold_count: 0,
        active: true,
      }));

      const { error: batchesError } = await (supabase as any)
        .from("ticket_batches")
        .insert(batchesPayload);

      if (batchesError) {
        setErrorMessage(
          batchesError.message ||
            "El evento se creó, pero no se pudieron guardar las tandas. Revisá ticket_batches."
        );
        setSaving(false);
        return;
      }
    }

    setMessage(
      form.tickets_enabled
        ? "Evento creado correctamente con anticipadas."
        : "Evento creado correctamente."
    );
    setForm(makeInitialForm());
    setEventImageFile(null);
    setEventImagePreview("");
    await loadEvents();
    setSaving(false);
  }

  async function handleActivateEvent(eventId: string) {
    resetMessages();
    setSaving(true);

    const { error: deactivateError } = await (supabase as any)
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

    const { error: activateError } = await (supabase as any)
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

    const { error } = await (supabase as any)
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
          <section className="rounded-[28px] border border-fuchsia-400/20 bg-[radial-gradient(circle_at_top,rgba(217,70,239,0.18),rgba(0,0,0,0.25)_45%,rgba(0,0,0,0.45))] p-5 shadow-[0_0_45px_rgba(217,70,239,0.12)]">
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

              <label className="block sm:col-span-2">
                <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Imagen del evento / historia
                </span>

                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleImageChange(e.target.files?.[0] ?? null)
                    }
                    className="block w-full text-sm text-white/70 file:mr-4 file:rounded-xl file:border-0 file:bg-fuchsia-500 file:px-4 file:py-2 file:text-sm file:font-black file:text-white hover:file:bg-fuchsia-400"
                  />

                  {eventImagePreview && (
                    <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                      <div className="relative aspect-[16/9] w-full">
                        <img
                          src={eventImagePreview}
                          alt="Preview evento"
                          className="h-full w-full object-cover"
                        />

                        <button
                          type="button"
                          onClick={() => handleImageChange(null)}
                          className="absolute right-3 top-3 rounded-full bg-black/70 p-2 text-white transition hover:bg-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  <p className="mt-2 text-xs text-white/45">
                    Esta imagen después la toma el RRPP Panel para generar la historia.
                  </p>
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                  Inicio del evento
                </span>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    type="datetime-local"
                    value={form.event_start}
                    onChange={(e) => updateForm("event_start", e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 py-3 pl-11 pr-4 text-white outline-none transition focus:border-fuchsia-400/50"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                  Cierre del evento
                </span>
                <div className="relative">
                  <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    type="datetime-local"
                    value={form.event_end}
                    onChange={(e) => updateForm("event_end", e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 py-3 pl-11 pr-4 text-white outline-none transition focus:border-fuchsia-400/50"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                  Lista / registros hasta
                </span>
                <div className="relative">
                  <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    type="datetime-local"
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
                  QR entrada válido hasta
                </span>
                <div className="relative">
                  <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    type="datetime-local"
                    value={form.qr_entry_until}
                    onChange={(e) =>
                      updateForm("qr_entry_until", e.target.value)
                    }
                    className="w-full rounded-2xl border border-white/10 bg-black/40 py-3 pl-11 pr-4 text-white outline-none transition focus:border-fuchsia-400/50"
                  />
                </div>
              </label>
            </div>

            <div className="mt-5 rounded-3xl border border-yellow-400/20 bg-yellow-500/10 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-yellow-400/15 p-2 text-yellow-200">
                    <Ticket className="h-5 w-5" />
                  </div>

                  <div>
                    <div className="text-sm font-black uppercase tracking-[0.22em] text-yellow-100">
                      Anticipadas
                    </div>
                    <p className="mt-1 text-xs text-white/55">
                      Activá venta de entradas por tandas. El link oficial y los links RRPP se conectan después.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    updateForm("tickets_enabled", !form.tickets_enabled)
                  }
                  className={`rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-[0.18em] transition ${
                    form.tickets_enabled
                      ? "bg-emerald-500 text-white hover:bg-emerald-400"
                      : "border border-white/10 bg-white/5 text-white/65 hover:bg-white/10"
                  }`}
                >
                  {form.tickets_enabled ? "Activadas" : "Desactivadas"}
                </button>
              </div>

              {form.tickets_enabled && (
                <div className="mt-4 space-y-3">
                  {form.ticket_batches.map((batch, index) => (
                    <div
                      key={batch.id}
                      className="rounded-2xl border border-white/10 bg-black/30 p-3"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-black uppercase tracking-[0.2em] text-white/75">
                            {index + 1}° tanda
                          </div>
                          <div className="mt-1 text-[11px] text-white/40">
                            Se vende en este orden. Si se agota, pasa a la siguiente.
                          </div>
                        </div>

                        {form.ticket_batches.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTicketBatch(batch.id)}
                            className="rounded-xl border border-red-400/20 bg-red-500/10 p-2 text-red-200 transition hover:bg-red-500/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block sm:col-span-2">
                          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                            Nombre tanda
                          </span>
                          <input
                            value={batch.name}
                            onChange={(e) =>
                              updateTicketBatch(batch.id, "name", e.target.value)
                            }
                            placeholder="Ej: Anticipada 1° tanda"
                            className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition placeholder:text-white/25 focus:border-yellow-300/50"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                            Precio
                          </span>
                          <input
                            inputMode="numeric"
                            value={batch.price}
                            onChange={(e) =>
                              updateTicketBatch(batch.id, "price", e.target.value)
                            }
                            placeholder="8000"
                            className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition placeholder:text-white/25 focus:border-yellow-300/50"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                            Comisión RRPP
                          </span>
                          <input
                            inputMode="numeric"
                            value={batch.rrpp_commission}
                            onChange={(e) =>
                              updateTicketBatch(
                                batch.id,
                                "rrpp_commission",
                                e.target.value
                              )
                            }
                            placeholder="1000"
                            className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition placeholder:text-white/25 focus:border-yellow-300/50"
                          />
                        </label>

                        <label className="block sm:col-span-2">
                          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                            Stock
                          </span>
                          <input
                            inputMode="numeric"
                            value={batch.stock}
                            onChange={(e) =>
                              updateTicketBatch(batch.id, "stock", e.target.value)
                            }
                            placeholder="Vacío = ilimitado"
                            className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition placeholder:text-white/25 focus:border-yellow-300/50"
                          />
                        </label>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addTicketBatch}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-yellow-300/20 bg-yellow-400/10 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-yellow-100 transition hover:bg-yellow-400/15"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar tanda
                  </button>
                </div>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4 text-xs text-white/50">
              Ejemplo ideal: inicio 24/04 23:00 · lista hasta 25/04 02:30 · QR
              hasta 25/04 04:00.
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={handleCreateEvent}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-fuchsia-500 px-5 py-3 text-sm font-black text-white shadow-[0_0_25px_rgba(217,70,239,0.35)] transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                {saving ? "Guardando..." : "Crear evento"}
              </button>

              <button
                onClick={() => {
                  setForm(makeInitialForm());
                  setEventImageFile(null);
                  setEventImagePreview("");
                }}
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

                {activeEvent.event_image_url && (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                    <img
                      src={activeEvent.event_image_url}
                      alt={activeEvent.name || "Imagen evento"}
                      className="aspect-[16/9] w-full object-cover"
                    />
                  </div>
                )}

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
                      {event.event_image_url && (
                        <img
                          src={event.event_image_url}
                          alt={event.name || "Evento"}
                          className="h-16 w-24 rounded-2xl border border-white/10 object-cover"
                        />
                      )}

                      <div className="min-w-0 flex-1">
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
                            Registros hasta:{" "}
                            {formatDateTime(event.registration_until)}
                          </span>
                          <span>
                            QR válido hasta:{" "}
                            {formatDateTime(event.qr_entry_until)}
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