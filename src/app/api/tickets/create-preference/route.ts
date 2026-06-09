import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type CreatePreferenceBody = {
  event_id?: string;
  batch_id?: string;
  rrpp_id?: string | null;
  buyer_user_id?: string | null;
  buyer_first_name?: string;
  buyer_last_name?: string;
  buyer_dni?: string;
  buyer_phone?: string;
  buyer_email?: string;
  quantity?: number;
};

function jsonResponse(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status });
}

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function makeToken(prefix: string) {
  const random = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  return `${prefix}_${random}`;
}

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const mercadoPagoAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const siteUrl = getSiteUrl();

    if (!supabaseUrl) {
      return jsonResponse(
        { ok: false, error: "Falta NEXT_PUBLIC_SUPABASE_URL en .env.local" },
        500
      );
    }

    if (!serviceRoleKey) {
      return jsonResponse(
        { ok: false, error: "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local" },
        500
      );
    }

    if (!mercadoPagoAccessToken) {
      return jsonResponse(
        { ok: false, error: "Falta MERCADOPAGO_ACCESS_TOKEN en .env.local" },
        500
      );
    }

    const body = (await req.json()) as CreatePreferenceBody;

    const eventId = cleanText(body.event_id);
    const requestedBatchId = cleanText(body.batch_id);
    const buyerFirstName = cleanText(body.buyer_first_name);
    const buyerLastName = cleanText(body.buyer_last_name);
    const buyerDni = cleanText(body.buyer_dni);
    const buyerPhone = cleanText(body.buyer_phone);
    const buyerEmail = cleanText(body.buyer_email);
    const quantity = Math.max(1, Number(body.quantity || 1));
    const rrppId = body.rrpp_id ? cleanText(body.rrpp_id) : null;
    const buyerUserId = body.buyer_user_id ? cleanText(body.buyer_user_id) : null;

    if (!eventId) {
      return jsonResponse({ ok: false, error: "Falta event_id" }, 400);
    }

    if (!buyerFirstName || !buyerLastName) {
      return jsonResponse({ ok: false, error: "Falta nombre y apellido" }, 400);
    }

    if (!buyerDni && !buyerPhone && !buyerEmail) {
      return jsonResponse(
        { ok: false, error: "Pedí al menos DNI, WhatsApp o email para recuperar la entrada" },
        400
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id,name,event_date,status,is_active,is_closed")
      .eq("id", eventId)
      .maybeSingle();

    if (eventError) {
      return jsonResponse(
        { ok: false, error: "Error buscando evento", detail: eventError },
        500
      );
    }

    if (!event) {
      return jsonResponse({ ok: false, error: "Evento no encontrado" }, 404);
    }

    const eventIsActive = event.is_active === true || event.status === "active";
    const eventIsClosed = event.is_closed === true || event.status === "closed";

    if (!eventIsActive || eventIsClosed) {
      return jsonResponse(
        { ok: false, error: "Este evento no tiene anticipadas activas." },
        400
      );
    }

    let batchQuery = supabase
      .from("ticket_batches")
      .select("id,event_id,name,batch_order,price,rrpp_commission,stock,sold_count,active")
      .eq("event_id", eventId)
      .eq("active", true)
      .order("batch_order", { ascending: true });

    if (requestedBatchId) {
      batchQuery = batchQuery.eq("id", requestedBatchId);
    }

    const { data: batches, error: batchError } = await batchQuery;

    if (batchError) {
      return jsonResponse(
        { ok: false, error: "Error buscando tandas", detail: batchError },
        500
      );
    }

    const availableBatch = (batches || []).find((batch: any) => {
      const stock = batch.stock;
      const sold = Number(batch.sold_count || 0);
      if (stock === null || typeof stock === "undefined") return true;
      return sold + quantity <= Number(stock);
    });

    if (!availableBatch) {
      return jsonResponse(
        { ok: false, error: "No hay tandas disponibles para este evento" },
        400
      );
    }

    const unitPrice = Number(availableBatch.price || 0);
    const totalAmount = unitPrice * quantity;
    const source = rrppId ? "rrpp" : "holy";
    const orderPublicToken = makeToken("ORD");

    if (!unitPrice || unitPrice <= 0) {
      return jsonResponse({ ok: false, error: "La tanda no tiene precio válido" }, 400);
    }

    const { data: order, error: orderError } = await supabase
      .from("ticket_orders")
      .insert({
        event_id: eventId,
        batch_id: availableBatch.id,
        source,
        rrpp_id: rrppId,
        buyer_user_id: buyerUserId,
        buyer_first_name: buyerFirstName,
        buyer_last_name: buyerLastName,
        buyer_dni: buyerDni || null,
        buyer_phone: buyerPhone || null,
        buyer_email: buyerEmail || null,
        quantity,
        unit_price: unitPrice,
        total_amount: totalAmount,
        payment_method: "mercadopago",
        payment_status: "pending",
        status: "pending",
        public_token: orderPublicToken,
      })
      .select("id,public_token")
      .single();

    if (orderError || !order) {
      return jsonResponse(
        { ok: false, error: "No se pudo crear la orden", detail: orderError },
        500
      );
    }

    const title = `${event.name || "HOLY"} - ${availableBatch.name || "Anticipada"}`;
    const description = `Entrada anticipada HOLY${source === "rrpp" ? " · RRPP" : ""}`;

    const preferencePayload: any = {
      items: [
        {
          id: availableBatch.id,
          title,
          description,
          quantity,
          unit_price: unitPrice,
          currency_id: "ARS",
        },
      ],
      payer: {
        name: buyerFirstName,
        surname: buyerLastName,
        email: buyerEmail || undefined,
        identification: buyerDni
          ? {
              type: "DNI",
              number: buyerDni,
            }
          : undefined,
      },
      external_reference: order.id,
      metadata: {
        order_id: order.id,
        event_id: eventId,
        batch_id: availableBatch.id,
        rrpp_id: rrppId,
        source,
        buyer_phone: buyerPhone || null,
        buyer_dni: buyerDni || null,
      },
      back_urls: {
        success: `${siteUrl}/entradas/gracias?order=${order.public_token}`,
        failure: `${siteUrl}/entradas/error?order=${order.public_token}`,
        pending: `${siteUrl}/entradas/pendiente?order=${order.public_token}`,
      },
      statement_descriptor: "HOLY CLUB",
    };

    // En local NO mandamos notification_url porque Mercado Pago necesita URL pública HTTPS.
    // En producción sí sirve para el webhook.
    if (!siteUrl.includes("localhost")) {
      preferencePayload.notification_url = `${siteUrl}/api/mercadopago/webhook`;
    }

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mercadoPagoAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferencePayload),
    });

    const mpData = await mpRes.json().catch(() => null);

    if (!mpRes.ok) {
      await supabase
        .from("ticket_orders")
        .update({
          status: "mp_error",
          mp_status: "preference_error",
          mp_status_detail: JSON.stringify(mpData || {}),
        })
        .eq("id", order.id);

      return jsonResponse(
        {
          ok: false,
          error: "Mercado Pago rechazó la preferencia.",
          detail: mpData,
        },
        500
      );
    }

    await supabase
      .from("ticket_orders")
      .update({
        mp_preference_id: mpData.id || null,
        mp_status: "preference_created",
      })
      .eq("id", order.id);

    return jsonResponse({
      ok: true,
      init_point: mpData.init_point,
      sandbox_init_point: mpData.sandbox_init_point,
      preference_id: mpData.id,
      order_id: order.id,
      order_public_token: order.public_token,
      event: {
        id: event.id,
        name: event.name,
      },
      batch: {
        id: availableBatch.id,
        name: availableBatch.name,
        price: unitPrice,
        rrpp_commission: Number(availableBatch.rrpp_commission || 0),
      },
    });
  } catch (error: any) {
    console.error("CREATE PREFERENCE ERROR:", error);

    return jsonResponse(
      {
        ok: false,
        error: error?.message || "Error inesperado creando preferencia",
      },
      500
    );
  }
}
