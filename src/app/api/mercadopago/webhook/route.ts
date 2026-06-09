import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type TicketOrder = {
  id: string;
  event_id: string;
  batch_id: string;
  source: string | null;
  rrpp_id: string | null;
  buyer_user_id: string | null;
  buyer_first_name: string;
  buyer_last_name: string;
  buyer_dni: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_status: string | null;
  status: string | null;
  mp_preference_id: string | null;
  mp_payment_id: string | null;
  mp_status: string | null;
  public_token: string | null;
};

type TicketBatch = {
  id: string;
  event_id: string;
  name: string | null;
  price: number | null;
  rrpp_commission: number | null;
  stock: number | null;
  sold_count: number | null;
  active: boolean | null;
};

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status });
}

function makeToken(prefix: string, size = 12) {
  const random = crypto.randomUUID().replace(/-/g, "").slice(0, size).toUpperCase();
  return `${prefix}_${random}`;
}

function makeQrToken() {
  return `HOLY-TICKET:${crypto.randomUUID().toUpperCase()}`;
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

async function getMercadoPagoPayment(paymentId: string) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN");

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(
      `Mercado Pago no devolvió el pago ${paymentId}: ${JSON.stringify(data || {})}`
    );
  }

  return data;
}

async function findOrderForPayment(supabase: ReturnType<typeof getSupabaseAdmin>, payment: any) {
  const metadataOrderId = payment?.metadata?.order_id || payment?.metadata?.orderId;
  const externalReference = payment?.external_reference;
  const preferenceId = payment?.preference_id;

  if (metadataOrderId) {
    const { data, error } = await supabase
      .from("ticket_orders")
      .select("*")
      .eq("id", metadataOrderId)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as TicketOrder;
  }

  if (externalReference) {
    const { data, error } = await supabase
      .from("ticket_orders")
      .select("*")
      .eq("id", externalReference)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as TicketOrder;
  }

  if (preferenceId) {
    const { data, error } = await supabase
      .from("ticket_orders")
      .select("*")
      .eq("mp_preference_id", preferenceId)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as TicketOrder;
  }

  return null;
}

async function generateTicketsForPaidOrder(params: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  order: TicketOrder;
  payment: any;
}) {
  const { supabase, order, payment } = params;

  const { data: existingTickets, error: existingTicketsError } = await supabase
    .from("tickets")
    .select("id,public_token,ticket_code")
    .eq("order_id", order.id);

  if (existingTicketsError) throw existingTicketsError;

  if (existingTickets && existingTickets.length > 0) {
    return {
      created: false,
      tickets: existingTickets,
    };
  }

  const { data: batch, error: batchError } = await supabase
    .from("ticket_batches")
    .select("id,event_id,name,price,rrpp_commission,stock,sold_count,active")
    .eq("id", order.batch_id)
    .maybeSingle();

  if (batchError) throw batchError;
  if (!batch) throw new Error("No se encontró la tanda de la orden");

  const safeBatch = batch as TicketBatch;
  const quantity = Math.max(1, Number(order.quantity || 1));
  const currentSold = Number(safeBatch.sold_count || 0);
  const stock = safeBatch.stock === null || typeof safeBatch.stock === "undefined"
    ? null
    : Number(safeBatch.stock);

  if (stock !== null && currentSold + quantity > stock) {
    await supabase
      .from("ticket_orders")
      .update({
        payment_status: "paid_stock_error",
        status: "paid_stock_error",
        mp_payment_id: String(payment.id || ""),
        mp_status: payment.status || null,
        mp_status_detail: "Pago aprobado, pero no había stock suficiente al generar tickets",
      })
      .eq("id", order.id);

    throw new Error("Pago aprobado, pero no hay stock suficiente para generar la entrada");
  }

  const commissionAmount = order.rrpp_id ? Number(safeBatch.rrpp_commission || 0) : 0;
  const ticketsPayload = Array.from({ length: quantity }).map(() => ({
    order_id: order.id,
    event_id: order.event_id,
    batch_id: order.batch_id,
    source: order.source || (order.rrpp_id ? "rrpp" : "holy"),
    rrpp_id: order.rrpp_id || null,
    buyer_user_id: order.buyer_user_id || null,
    buyer_first_name: order.buyer_first_name,
    buyer_last_name: order.buyer_last_name,
    buyer_dni: order.buyer_dni || null,
    buyer_phone: order.buyer_phone || null,
    buyer_email: order.buyer_email || null,
    ticket_code: makeToken("TK", 10),
    public_token: makeToken("PUB", 10),
    qr_token: makeQrToken(),
    price: Number(order.unit_price || safeBatch.price || 0),
    rrpp_commission: commissionAmount,
    payment_status: "paid",
    status: "valid",
  }));

  const { data: createdTickets, error: ticketsError } = await supabase
    .from("tickets")
    .insert(ticketsPayload)
    .select("id,public_token,ticket_code,rrpp_id,rrpp_commission");

  if (ticketsError) throw ticketsError;

  await supabase
    .from("ticket_batches")
    .update({ sold_count: currentSold + quantity })
    .eq("id", order.batch_id);

  if (order.rrpp_id && createdTickets && createdTickets.length > 0) {
    const commissionsPayload = createdTickets.map((ticket: any) => ({
      ticket_id: ticket.id,
      order_id: order.id,
      event_id: order.event_id,
      batch_id: order.batch_id,
      rrpp_id: order.rrpp_id,
      amount: Number(ticket.rrpp_commission || commissionAmount || 0),
      status: "pending",
    }));

    const { error: commissionError } = await supabase
      .from("ticket_commissions")
      .insert(commissionsPayload);

    if (commissionError) throw commissionError;
  }

  await supabase
    .from("ticket_orders")
    .update({
      payment_status: "paid",
      status: "paid",
      mp_payment_id: String(payment.id || ""),
      mp_status: payment.status || null,
      mp_status_detail: payment.status_detail || null,
      approved_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  return {
    created: true,
    tickets: createdTickets || [],
  };
}

async function processPayment(paymentId: string) {
  const supabase = getSupabaseAdmin();
  const payment = await getMercadoPagoPayment(paymentId);
  const order = await findOrderForPayment(supabase, payment);

  if (!order) {
    return {
      ok: false,
      ignored: true,
      reason: "No se encontró orden para este pago",
      payment_id: paymentId,
      mp_status: payment?.status || null,
    };
  }

  await supabase
    .from("ticket_orders")
    .update({
      mp_payment_id: String(payment.id || paymentId),
      mp_status: payment.status || null,
      mp_status_detail: payment.status_detail || null,
    })
    .eq("id", order.id);

  if (payment.status !== "approved") {
    await supabase
      .from("ticket_orders")
      .update({
        payment_status: payment.status || "pending",
        status: payment.status === "rejected" ? "rejected" : "pending",
      })
      .eq("id", order.id);

    return {
      ok: true,
      approved: false,
      order_id: order.id,
      payment_id: paymentId,
      mp_status: payment.status,
      mp_status_detail: payment.status_detail,
    };
  }

  const ticketsResult = await generateTicketsForPaidOrder({
    supabase,
    order,
    payment,
  });

  return {
    ok: true,
    approved: true,
    order_id: order.id,
    payment_id: paymentId,
    tickets_created: ticketsResult.created,
    tickets: ticketsResult.tickets,
  };
}

function extractPaymentIdFromUrl(req: NextRequest) {
  const url = new URL(req.url);

  return (
    url.searchParams.get("id") ||
    url.searchParams.get("data.id") ||
    url.searchParams.get("payment_id") ||
    ""
  );
}

function extractPaymentIdFromBody(body: any) {
  return String(
    body?.data?.id ||
      body?.id ||
      body?.payment_id ||
      body?.resource?.id ||
      ""
  );
}

function isPaymentNotification(req: NextRequest, body?: any) {
  const url = new URL(req.url);
  const topic = String(url.searchParams.get("topic") || url.searchParams.get("type") || body?.type || body?.topic || "").toLowerCase();
  return topic === "payment" || topic === "payments" || !topic;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    if (!isPaymentNotification(req, body)) {
      return json({ ok: true, ignored: true, reason: "Notificación no payment" });
    }

    const paymentId = extractPaymentIdFromBody(body) || extractPaymentIdFromUrl(req);

    if (!paymentId) {
      return json({ ok: true, ignored: true, reason: "Sin payment id" });
    }

    const result = await processPayment(paymentId);
    return json(result);
  } catch (error: any) {
    console.error("MP WEBHOOK ERROR:", error);
    return json({ ok: false, error: error?.message || "Error procesando webhook" }, 500);
  }
}

// Útil para testear desde el navegador o consola:
// /api/mercadopago/webhook?payment_id=123456
export async function GET(req: NextRequest) {
  try {
    const paymentId = extractPaymentIdFromUrl(req);

    if (!paymentId) {
      return json({ ok: false, error: "Falta payment_id" }, 400);
    }

    const result = await processPayment(paymentId);
    return json(result);
  } catch (error: any) {
    console.error("MP WEBHOOK GET ERROR:", error);
    return json({ ok: false, error: error?.message || "Error procesando pago" }, 500);
  }
}
