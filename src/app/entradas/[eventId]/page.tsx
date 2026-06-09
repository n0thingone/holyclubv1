"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Loader2,
  Phone,
  Ticket,
  User,
  WalletCards,
} from "lucide-react";

type EventRow = {
  id: string;
  name: string | null;
  event_date: string | null;
  status: string | null;
  is_active: boolean | null;
  is_closed: boolean | null;
  event_image_url?: string | null;
};

type TicketBatch = {
  id: string;
  event_id: string;
  name: string | null;
  batch_order: number | null;
  price: number | null;
  rrpp_commission: number | null;
  stock: number | null;
  sold_count: number | null;
  active: boolean | null;
};

type RrppProfile = {
  id: string;
  slug: string | null;
  display_name: string | null;
};

type BuyerForm = {
  firstName: string;
  lastName: string;
  dni: string;
  phone: string;
  email: string;
};

const initialForm: BuyerForm = {
  firstName: "",
  lastName: "",
  dni: "",
  phone: "",
  email: "",
};

function formatMoney(value: number) {
  return `$${Number(value || 0).toLocaleString("es-AR")}`;
}

function formatDate(value?: string | null) {
  if (!value) return "Fecha a confirmar";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha a confirmar";

  const text = date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function cleanDigits(value: string) {
  return value.replace(/\D/g, "");
}

function getAvailable(batch: TicketBatch | null) {
  if (!batch) return null;
  if (batch.stock === null || typeof batch.stock === "undefined") return null;
  return Math.max(0, Number(batch.stock || 0) - Number(batch.sold_count || 0));
}

export default function ComprarEntradaPage() {
  const params = useParams<{ eventId: string }>();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => getSupabaseClient(), []);

  const eventId = String(params?.eventId || "");
  const ref = searchParams.get("ref") || "";
  const rrppIdFromUrl = searchParams.get("rrpp_id") || "";

  const [event, setEvent] = useState<EventRow | null>(null);
  const [batches, setBatches] = useState<TicketBatch[]>([]);
  const [rrpp, setRrpp] = useState<RrppProfile | null>(null);
  const [form, setForm] = useState<BuyerForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const currentBatch = useMemo(() => {
    return (
      batches.find((batch) => {
        if (!batch.active) return false;
        if (batch.stock === null || typeof batch.stock === "undefined")
          return true;
        return Number(batch.sold_count || 0) < Number(batch.stock || 0);
      }) || null
    );
  }, [batches]);

  const available = getAvailable(currentBatch);
  const isSoldOut = !currentBatch || available === 0;

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");

      const [eventRes, batchRes] = await Promise.all([
        supabase
          .from("events")
          .select(
            "id,name,event_date,status,is_active,is_closed,event_image_url",
          )
          .eq("id", eventId)
          .maybeSingle(),
        supabase
          .from("ticket_batches")
          .select(
            "id,event_id,name,batch_order,price,rrpp_commission,stock,sold_count,active",
          )
          .eq("event_id", eventId)
          .eq("active", true)
          .order("batch_order", { ascending: true }),
      ]);

      if (!alive) return;

      if (eventRes.error) {
        setError(eventRes.error.message || "No se pudo cargar el evento.");
        setLoading(false);
        return;
      }

      if (!eventRes.data) {
        setError("No encontramos este evento.");
        setLoading(false);
        return;
      }

      const loadedEvent = eventRes.data as EventRow;
      const eventIsActive =
        loadedEvent.is_active === true || loadedEvent.status === "active";
      const eventIsClosed =
        loadedEvent.is_closed === true || loadedEvent.status === "closed";

      if (!eventIsActive || eventIsClosed) {
        setEvent(null);
        setBatches([]);
        setError("Las anticipadas para este evento no están disponibles.");
        setLoading(false);
        return;
      }

      if (batchRes.error) {
        setError(
          batchRes.error.message || "No se pudieron cargar las anticipadas.",
        );
        setLoading(false);
        return;
      }

      setEvent(eventRes.data as EventRow);
      setBatches((batchRes.data || []) as TicketBatch[]);

      if (ref) {
        const { data } = await supabase
          .from("rrpp_profiles")
          .select("id,slug,display_name")
          .eq("slug", ref)
          .maybeSingle();

        if (alive && data) setRrpp(data as RrppProfile);
      }

      setLoading(false);
    }

    if (eventId) load();

    return () => {
      alive = false;
    };
  }, [eventId, ref, supabase]);

  function updateForm<K extends keyof BuyerForm>(key: K, value: BuyerForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateForm() {
    const eventIsActive = event?.is_active === true || event?.status === "active";
    const eventIsClosed = event?.is_closed === true || event?.status === "closed";

    if (!event || !eventIsActive || eventIsClosed) {
      return "Las anticipadas para este evento no están disponibles.";
    }

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const dni = cleanDigits(form.dni);
    const phone = cleanDigits(form.phone);
    const email = form.email.trim();

    if (!firstName) return "Poné tu nombre.";
    if (!lastName) return "Poné tu apellido.";
    if (!dni) return "Poné tu DNI para recuperar la entrada.";
    if (dni.length < 6) return "Revisá el DNI.";
    if (!phone) return "Poné tu WhatsApp para recuperar la entrada.";
    if (phone.length < 8) return "Revisá el WhatsApp.";
    if (email && !email.includes("@")) return "Revisá el email.";
    if (!currentBatch) return "No hay anticipadas disponibles.";
    if (isSoldOut) return "Las anticipadas están agotadas.";

    return "";
  }

  async function handlePay() {
    setError("");
    setMessage("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!currentBatch || !event) return;

    const eventIsActive = event.is_active === true || event.status === "active";
    const eventIsClosed = event.is_closed === true || event.status === "closed";

    if (!eventIsActive || eventIsClosed) {
      setError("Este evento ya no está activo.");
      return;
    }

    setPaying(true);

    try {
      const rrppId = rrppIdFromUrl || rrpp?.id || null;

      const response = await fetch("/api/tickets/create-preference", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_id: event.id,
          batch_id: currentBatch.id,
          rrpp_id: rrppId,
          buyer_first_name: form.firstName.trim(),
          buyer_last_name: form.lastName.trim(),
          buyer_dni: cleanDigits(form.dni),
          buyer_phone: cleanDigits(form.phone),
          buyer_email: form.email.trim(),
          quantity: 1,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo crear el link de pago.");
      }

      const paymentUrl = data.init_point || data.sandbox_init_point;

      if (!paymentUrl) {
        throw new Error("Mercado Pago no devolvió link de pago.");
      }

      setMessage("Redirigiendo a Mercado Pago...");
      window.location.href = paymentUrl;
    } catch (err: any) {
      setError(err?.message || "Error iniciando el pago.");
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-4 py-6 text-white">
        <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
          <div className="rounded-[2rem] border border-yellow-400/20 bg-zinc-950 p-8 text-center shadow-[0_0_55px_rgba(234,179,8,0.12)]">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-yellow-400" />
            <p className="text-sm font-black uppercase tracking-[0.25em] text-yellow-300">
              Cargando anticipadas
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error && !event) {
    return (
      <main className="min-h-screen bg-black px-4 py-6 text-white">
        <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
          <div className="rounded-[2rem] border border-red-500/30 bg-red-950/20 p-8 text-center">
            <p className="text-xl font-black text-red-200">No disponible</p>
            <p className="mt-2 text-sm text-red-100/70">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(234,179,8,0.13),transparent_30%),radial-gradient(circle_at_bottom,rgba(0,177,234,0.08),transparent_34%)]" />

      {event?.event_image_url && (
        <div
          className="pointer-events-none fixed inset-0 opacity-20 blur-2xl saturate-125"
          style={{
            backgroundImage: `url(${event.event_image_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform: "scale(1.08)",
          }}
        />
      )}

      <div className="relative mx-auto max-w-md px-4 pb-10 pt-4">
        <div className="mb-3 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.34em] text-yellow-300">
            Anticipadas oficiales
          </p>
          <h1 className="mt-1 text-2xl font-black uppercase leading-none text-white">
            {event?.name || "HOLY CLUB"}
          </h1>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-yellow-400/25 bg-yellow-400/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-yellow-100">
            <CalendarDays className="h-3.5 w-3.5 text-yellow-300" />
            <span>{formatDate(event?.event_date)}</span>
          </div>
        </div>

        <section className="rounded-[2rem] border border-yellow-400/25 bg-zinc-950/92 p-5 shadow-[0_0_70px_rgba(234,179,8,0.16)] backdrop-blur">
          <div className="mb-4 rounded-[1.55rem] border border-yellow-400/20 bg-[radial-gradient(circle_at_top_left,rgba(234,179,8,0.18),rgba(0,0,0,0.35)_46%,rgba(0,0,0,0.55))] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-yellow-400 text-black shadow-[0_0_26px_rgba(250,204,21,0.32)]">
                    <Ticket className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">
                      Tanda actual
                    </p>
                    <h2 className="truncate text-lg font-black text-white">
                      {currentBatch?.name || "Sin anticipadas"}
                    </h2>
                  </div>
                </div>

                {rrpp && (
                  <p className="mt-3 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-2 text-xs font-bold text-fuchsia-200">
                    RRPP: {rrpp.display_name || rrpp.slug}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-right">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">
                  Precio
                </p>
                <p className="text-xl font-black text-emerald-300">
                  {currentBatch
                    ? formatMoney(Number(currentBatch.price || 0))
                    : "—"}
                </p>
              </div>
            </div>

            {currentBatch ? (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <InfoBox
                  label="Disponibles"
                  value={available === null ? "Ilimitado" : `${available}`}
                  green={!isSoldOut}
                />
                <InfoBox
                  label="Estado"
                  value={isSoldOut ? "Agotada" : "Disponible"}
                  green={!isSoldOut}
                />
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-950/20 p-4 text-sm font-bold text-red-100">
                No hay anticipadas disponibles para este evento.
              </div>
            )}
          </div>

          <div className="mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-yellow-300" />
            <h2 className="text-lg font-black">Tus datos</h2>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Nombre"
                value={form.firstName}
                onChange={(value) => updateForm("firstName", value)}
                placeholder="Juan"
              />
              <Field
                label="Apellido"
                value={form.lastName}
                onChange={(value) => updateForm("lastName", value)}
                placeholder="Pérez"
              />
            </div>

            <Field
              label="DNI"
              value={form.dni}
              onChange={(value) => updateForm("dni", cleanDigits(value))}
              placeholder="Para recuperar tu entrada"
              inputMode="numeric"
            />

            <Field
              label="WhatsApp"
              value={form.phone}
              onChange={(value) => updateForm("phone", cleanDigits(value))}
              placeholder="2984..."
              inputMode="tel"
              icon={<Phone className="h-4 w-4" />}
            />

            <Field
              label="Email opcional"
              value={form.email}
              onChange={(value) => updateForm("email", value)}
              placeholder="tu@email.com"
              inputMode="email"
            />
          </div>

          {!!error && (
            <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
              {error}
            </div>
          )}

          {!!message && (
            <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200">
              {message}
            </div>
          )}

          <button
            type="button"
            onClick={handlePay}
            disabled={paying || isSoldOut || !currentBatch}
            className="mt-5 flex w-full items-center justify-center gap-3 rounded-2xl bg-[#00b1ea] px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_0_35px_rgba(0,177,234,0.32)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400 disabled:shadow-none"
          >
            {paying ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creando pago...
              </>
            ) : (
              <>
                <MercadoPagoIcon />
                Pagar con Mercado Pago
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>

          <p className="mt-3 text-center text-xs leading-relaxed text-zinc-500">
            Tu entrada con QR se genera automáticamente después del pago
            aprobado.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <TrustItem
              icon={<CreditCard className="h-4 w-4" />}
              label="Tarjeta"
            />
            <TrustItem icon={<WalletCards className="h-4 w-4" />} label="MP" />
            <TrustItem icon={<CheckCircle2 className="h-4 w-4" />} label="QR" />
          </div>
        </section>

        <p className="mt-5 px-3 text-center text-xs leading-relaxed text-zinc-500">
          Si no guardás el QR, el staff puede recuperar tu entrada por DNI o
          WhatsApp.
        </p>
      </div>
    </main>
  );
}

function InfoBox({
  label,
  value,
  green = false,
}: {
  label: string;
  value: string;
  green?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/45 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>
      <p
        className={
          green
            ? "mt-1 text-sm font-black text-emerald-300"
            : "mt-1 text-sm font-black text-white"
        }
      >
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
  icon?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
        {icon}
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode || "text"}
        className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-zinc-700 focus:border-yellow-400/60 focus:ring-2 focus:ring-yellow-400/10"
      />
    </label>
  );
}

function TrustItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 px-2 py-3 text-zinc-300">
      <div className="mx-auto mb-1 flex justify-center text-yellow-300">
        {icon}
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.16em]">
        {label}
      </p>
    </div>
  );
}

function MercadoPagoIcon() {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#00b1ea] shadow-[0_0_18px_rgba(255,255,255,0.28)]">
      <span className="text-[10px] font-black tracking-[-0.08em]">MP</span>
    </span>
  );
}
