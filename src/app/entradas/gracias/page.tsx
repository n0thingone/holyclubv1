"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  RefreshCw,
  Ticket,
} from "lucide-react";

type TicketData = {
  id: string;
  ticket_code: string;
  public_token: string;
  qr_token: string;
  price: number;
  payment_status: string;
  status: string;
  entry_used_at: string | null;
  url: string;
  qr_image_url: string;
};

type StatusData = {
  ok: boolean;
  error?: string;
  order?: {
    id: string;
    public_token: string | null;
    buyer_first_name: string;
    buyer_last_name: string;
    payment_status: string | null;
    status: string | null;
    mp_status: string | null;
    mp_payment_id: string | null;
    total_amount: number;
    paid: boolean;
  };
  event?: {
    id: string;
    name: string | null;
    event_date: string | null;
  } | null;
  batch?: {
    id: string;
    name: string | null;
    price: number | null;
  } | null;
  tickets?: TicketData[];
};

function formatMoney(value?: number | null) {
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

function EntradaGraciasContent() {
  const searchParams = useSearchParams();
  const order = searchParams.get("order") || searchParams.get("order_id") || "";
  const paymentId =
    searchParams.get("payment_id") ||
    searchParams.get("collection_id") ||
    searchParams.get("data.id") ||
    "";

  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const forcedPaymentRef = useRef(false);

  const tickets = data?.tickets || [];
  const firstTicket = tickets[0] || null;
  const isPaid = !!data?.order?.paid;
  const hasQr = tickets.length > 0;

  const statusLabel = useMemo(() => {
    if (hasQr) return "QR generado";
    if (isPaid) return "Pago aprobado";
    if (processingPayment) return "Confirmando pago";
    return "Esperando aprobación";
  }, [hasQr, isPaid, processingPayment]);

  async function forceProcessPayment() {
    if (!paymentId || forcedPaymentRef.current) return;
    forcedPaymentRef.current = true;

    try {
      setProcessingPayment(true);
      await fetch(`/api/mercadopago/webhook?payment_id=${encodeURIComponent(paymentId)}`, {
        cache: "no-store",
      }).catch(() => null);
    } finally {
      setProcessingPayment(false);
    }
  }

  async function loadStatus() {
    if (!order) {
      setError("No encontramos la orden de la compra.");
      setLoading(false);
      return null;
    }

    try {
      const res = await fetch(`/api/tickets/order-status?order=${encodeURIComponent(order)}`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as StatusData | null;

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "No se pudo consultar la entrada.");
      }

      setData(json);
      setError("");
      return json;
    } catch (err: any) {
      setError(err?.message || "Error consultando la entrada.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function start() {
      // Primero consultamos si el webhook ya creó el ticket.
      // Solo si todavía no hay QR, usamos el GET del webhook como fallback.
      const firstStatus = await loadStatus();

      if (cancelled) return;

      const alreadyHasQr = (firstStatus?.tickets || []).length > 0;

      if (!alreadyHasQr && paymentId) {
        await forceProcessPayment();

        if (!cancelled) {
          await loadStatus();
        }
      }
    }

    void start();

    const interval = setInterval(() => {
      void loadStatus();
    }, 2500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, paymentId]);

  async function copyLink() {
    if (!firstTicket?.url) return;
    await navigator.clipboard.writeText(firstTicket.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-black px-4 py-6 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.14),transparent_31%),radial-gradient(circle_at_bottom,rgba(234,179,8,0.10),transparent_35%)]" />

      <div className="relative mx-auto flex min-h-[88vh] max-w-md items-center justify-center">
        <section className="w-full rounded-[2rem] border border-emerald-400/25 bg-zinc-950/95 p-5 text-center shadow-[0_0_70px_rgba(16,185,129,0.14)]">
          {loading ? (
            <>
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-yellow-300" />
              <h1 className="mt-4 text-2xl font-black">Buscando tu entrada...</h1>
              <p className="mt-2 text-sm text-zinc-400">Aguantá unos segundos.</p>
            </>
          ) : error ? (
            <>
              <Clock className="mx-auto h-12 w-12 text-yellow-300" />
              <h1 className="mt-4 text-2xl font-black">Estamos revisando el pago</h1>
              <p className="mt-2 text-sm text-zinc-400">{error}</p>
              <button
                onClick={loadStatus}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-black text-black"
              >
                <RefreshCw className="h-4 w-4" />
                Reintentar
              </button>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400 text-black shadow-[0_0_35px_rgba(52,211,153,0.32)]">
                {hasQr ? <CheckCircle2 className="h-9 w-9" /> : <Loader2 className="h-9 w-9 animate-spin" />}
              </div>

              <p className="mt-4 text-[11px] font-black uppercase tracking-[0.3em] text-emerald-300">
                {statusLabel}
              </p>

              <h1 className="mt-2 text-2xl font-black uppercase leading-tight">
                {hasQr ? "Tu entrada está lista" : "Procesando tu QR"}
              </h1>

              <p className="mt-2 text-sm text-zinc-400">
                {data?.event?.name || "HOLY CLUB"} · {formatDate(data?.event?.event_date)}
              </p>

              <div className="mt-4 rounded-3xl border border-white/10 bg-black/40 p-4 text-left">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-400 text-black">
                    <Ticket className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white">
                      {data?.order?.buyer_first_name} {data?.order?.buyer_last_name}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {data?.batch?.name || "Anticipada"} · {formatMoney(data?.order?.total_amount)}
                    </p>
                  </div>
                </div>
              </div>

              {hasQr && firstTicket ? (
                <>
                  <div className="mx-auto mt-5 w-fit rounded-[1.7rem] bg-white p-3">
                    <img
                      src={firstTicket.qr_image_url}
                      alt="QR entrada HOLY"
                      className="h-64 w-64"
                    />
                  </div>

                  <p className="mt-3 break-all rounded-2xl bg-black p-3 font-mono text-[11px] text-zinc-400">
                    {firstTicket.ticket_code}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <a
                      href={firstTicket.url}
                      className="rounded-2xl bg-emerald-400 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-black"
                    >
                      Abrir entrada
                    </a>
                    <button
                      onClick={copyLink}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white"
                    >
                      <Copy className="h-4 w-4" />
                      {copied ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-5 rounded-3xl border border-yellow-400/25 bg-yellow-400/10 p-4 text-sm font-bold text-yellow-100">
                  Si el pago ya fue aprobado, el QR puede tardar unos segundos en generarse. No cierres esta pantalla.
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}


export default function EntradaGraciasPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black px-4 py-6 text-white">
          <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
            <div className="rounded-[2rem] border border-yellow-400/20 bg-zinc-950 p-8 text-center shadow-[0_0_55px_rgba(234,179,8,0.12)]">
              <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-yellow-400" />
              <p className="text-sm font-black uppercase tracking-[0.25em] text-yellow-300">
                Cargando entrada
              </p>
            </div>
          </div>
        </main>
      }
    >
      <EntradaGraciasContent />
    </Suspense>
  );
}
