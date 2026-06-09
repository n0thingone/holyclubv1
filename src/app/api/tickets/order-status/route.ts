import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status });
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

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const orderParam = String(
      url.searchParams.get("order") ||
        url.searchParams.get("order_token") ||
        url.searchParams.get("order_id") ||
        ""
    ).trim();

    if (!orderParam) {
      return json({ ok: false, error: "Falta order" }, 400);
    }

    const supabase = getSupabaseAdmin();

    let orderQuery = supabase
      .from("ticket_orders")
      .select(
        "id,public_token,event_id,batch_id,buyer_first_name,buyer_last_name,buyer_dni,buyer_phone,buyer_email,quantity,total_amount,payment_status,status,mp_payment_id,mp_status,mp_status_detail,created_at"
      );

    if (orderParam.startsWith("ORD_")) {
      orderQuery = orderQuery.eq("public_token", orderParam);
    } else {
      orderQuery = orderQuery.eq("id", orderParam);
    }

    const { data: order, error: orderError } = await orderQuery.maybeSingle();

    if (orderError) {
      return json({ ok: false, error: "Error buscando orden", detail: orderError }, 500);
    }

    if (!order) {
      return json({ ok: false, error: "Orden no encontrada" }, 404);
    }

    const [{ data: event }, { data: batch }, { data: tickets, error: ticketsError }] =
      await Promise.all([
        supabase
          .from("events")
          .select("id,name,event_date")
          .eq("id", order.event_id)
          .maybeSingle(),
        supabase
          .from("ticket_batches")
          .select("id,name,price")
          .eq("id", order.batch_id)
          .maybeSingle(),
        supabase
          .from("tickets")
          .select(
            "id,ticket_code,public_token,qr_token,price,payment_status,status,entry_used_at,created_at"
          )
          .eq("order_id", order.id)
          .order("created_at", { ascending: true }),
      ]);

    if (ticketsError) {
      return json({ ok: false, error: "Error buscando tickets", detail: ticketsError }, 500);
    }

    const siteUrl = getSiteUrl();

    return json({
      ok: true,
      order: {
        ...order,
        paid:
          order.payment_status === "paid" ||
          order.status === "paid" ||
          order.mp_status === "approved",
      },
      event: event || null,
      batch: batch || null,
      tickets: (tickets || []).map((ticket: any) => ({
        ...ticket,
        url: `${siteUrl}/ticket/${ticket.public_token}`,
        qr_image_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(ticket.qr_token)}`,
      })),
    });
  } catch (error: any) {
    console.error("ORDER STATUS ERROR:", error);
    return json({ ok: false, error: error?.message || "Error inesperado" }, 500);
  }
}
