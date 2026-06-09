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
  ShieldCheck,
  Sparkles,
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

  return date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
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
    return batches.find((batch) => {
      if (!batch.active) return false;
      if (batch.stock === null || typeof batch.stock === "undefined") return true;
      return Number(batch.sold_count || 0) < Number(batch.stock || 0);
    }) || null;
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
          .select("id,name,event_date,status,is_active,is_closed,event_image_url")
          .eq("id", eventId)
          .maybeSingle(),
        supabase
          .from("ticket_batches")
          .select("id,event_id,name,batch_order,price,rrpp_commission,stock,sold_count,active")
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

      if (batchRes.error) {
        setError(batchRes.error.message || "No se pudieron cargar las anticipadas.");
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
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(234,179,8,0.12),transparent_32%),radial-gradient(circle_at_bottom,rgba(217,70,239,0.10),transparent_35%)]" />

      {event?.event_image_url && (
        <div
          className="pointer-events-none fixed inset-0 opacity-25 blur-2xl saturate-125"
          style={{
            backgroundImage: `url(${event.event_image_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform: "scale(1.08)",
          }}
        />
      )}

      <div className="relative mx-auto max-w-md px-4 pb-10 pt-5">
        <section className="overflow-hidden rounded-[2rem] border border-yellow-400/30 bg-zinc-950/90 shadow-[0_0_70px_rgba(234,179,8,0.18)] backdrop-blur">
          <div className="relative p-5">
            <div className="absolute right-5 top-5 rounded-full border border-yellow-300/30 bg-yellow-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-yellow-200">
              Oficial
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 to-yellow-500 text-black shadow-[0_0_32px_rgba(250,204,21,0.35)]">
                <Ticket className="h-6 w-6" />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-yellow-300">
                  HOLY CLUB
                </p>
                <h1 className="mt-1 text-2xl font-black leading-none">
                  ANTICIPADAS
                </h1>
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-black/40 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-yellow-300">
                {event?.name || "Evento"}
              </p>

              <div className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
                <CalendarDays className="h-4 w-4 text-yellow-300" />
                <span className="capitalize">{formatDate(event?.event_date)}</span>
              </div>

              {rrpp && (
                <div className="mt-3 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-2 text-xs font-bold text-fuchsia-200">
                  Link de RRPP: {rrpp.display_name || rrpp.slug}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-[2rem] border border-white/10 bg-zinc-950/90 p-5 shadow-[0_0_45px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-yellow-300">
                Tanda actual
              </p>
              <h2 className="mt-1 text-xl font-black">
                {currentBatch?.name || "Sin anticipadas"}
              </h2>
            </div>

            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-right">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-300">
                Precio
              </p>
              <p className="text-xl font-black text-emerald-300">
                {currentBatch ? formatMoney(Number(currentBatch.price || 0)) : "—"}
              </p>
            </div>
          </div>

          {currentBatch ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <InfoBox
                  label="Stock"
                  value={available === null ? "Ilimitado" : `${available} disponibles`}
                />
                <InfoBox
                  label="Estado"
                  value={isSoldOut ? "Agotada" : "Disponible"}
                  green={!isSoldOut}
                />
              </div>

              <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-3 text-xs text-yellow-100/85">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-300" />
                  <p>
                    Entrada oficial de HOLY. Después del pago, Mercado Pago confirma y se genera tu QR.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-100">
              No hay anticipadas disponibles para este evento.
            </div>
          )}
        </section>

        <section className="mt-4 rounded-[2rem] border border-white/10 bg-zinc-950/90 p-5 shadow-[0_0_45px_rgba(0,0,0,0.35)] backdrop-blur">
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
                placeholder="Thomas"
              />
              <Field
                label="Apellido"
                value={form.lastName}
                onChange={(value) => updateForm("lastName", value)}
                placeholder="Mayer"
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

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <TrustItem icon={<CreditCard className="h-4 w-4" />} label="Tarjeta" />
            <TrustItem icon={<WalletCards className="h-4 w-4" />} label="MP" />
            <TrustItem icon={<CheckCircle2 className="h-4 w-4" />} label="QR" />
          </div>
        </section>

        <p className="mt-5 px-3 text-center text-xs leading-relaxed text-zinc-500">
          Si no guardás el QR, el staff puede recuperar tu entrada por DNI o WhatsApp.
        </p>
      </div>
    </main>
  );
}

function InfoBox({ label, value, green = false }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/45 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className={green ? "mt-1 text-sm font-black text-emerald-300" : "mt-1 text-sm font-black text-white"}>
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
      <div className="mx-auto mb-1 flex justify-center text-yellow-300">{icon}</div>
      <p className="text-[10px] font-black uppercase tracking-[0.16em]">{label}</p>
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
