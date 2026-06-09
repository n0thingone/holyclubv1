// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

const PAY_PER_ENTRY = 1000;

function getMonthKey(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonthLabel(monthKey: string) {
  if (!monthKey) return "Mes";
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  return date.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
}

function formatEventDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function money(value: number) {
  return `$${Number(value || 0).toLocaleString("es-AR")}`;
}

export default function MisRendimientosPage() {
  const supabase = getSupabaseClient();
  const { profile, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [rrpp, setRrpp] = useState<any>(null);
  const [guests, setGuests] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketBatches, setTicketBatches] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [activeTab, setActiveTab] = useState<"free" | "anticipadas">("free");

  async function loadData() {
    setLoading(true);

    const profileId = profile?.id || user?.id;

    if (!profileId) {
      setLoading(false);
      return;
    }

    const { data: rrppData, error: rrppError } = await supabase
      .from("rrpp_profiles")
      .select("*")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (rrppError) {
      console.error("Error cargando RRPP:", rrppError);
    }

    if (!rrppData) {
      setLoading(false);
      return;
    }

    setRrpp(rrppData);

    const [guestRes, ticketRes] = await Promise.all([
      supabase
        .from("guest_registrations")
        .select(
          "id,event_id,rrpp_id,first_name,last_name,dni_last3,registration_status,created_at"
        )
        .eq("rrpp_id", rrppData.id)
        .order("created_at", { ascending: false }),

      (supabase as any)
        .from("tickets")
        .select(
          "id,order_id,event_id,batch_id,source,rrpp_id,buyer_first_name,buyer_last_name,buyer_dni,buyer_phone,buyer_email,ticket_code,price,rrpp_commission,payment_status,status,entry_used_at,created_at"
        )
        .eq("rrpp_id", rrppData.id)
        .eq("payment_status", "paid")
        .order("created_at", { ascending: false }),
    ]);

    if (guestRes.error) {
      console.error("Error cargando invitados:", guestRes.error);
    }

    if (ticketRes.error) {
      console.error("Error cargando anticipadas RRPP:", ticketRes.error);
    }

    const safeGuests = guestRes.data || [];
    const safeTickets = ticketRes.data || [];

    const eventIds = Array.from(
      new Set([
        ...safeGuests.map((g) => g.event_id).filter(Boolean),
        ...safeTickets.map((t) => t.event_id).filter(Boolean),
      ])
    );

    const registrationIds = Array.from(
      new Set(safeGuests.map((g) => g.id).filter(Boolean))
    );

    const batchIds = Array.from(
      new Set(safeTickets.map((t) => t.batch_id).filter(Boolean))
    );

    let eventData: any[] = [];
    let checkinData: any[] = [];
    let batchData: any[] = [];

    if (eventIds.length > 0) {
      const { data, error } = await supabase
        .from("events")
        .select("id,name,event_date,status,is_active,created_at")
        .in("id", eventIds);

      if (error) {
        console.error("Error cargando eventos:", error);
      }

      eventData = data || [];
    }

    if (registrationIds.length > 0) {
      const { data, error } = await supabase
        .from("checkins")
        .select("id,event_id,registration_id,rrpp_id,checked_in_at,result")
        .in("registration_id", registrationIds);

      if (error) {
        console.error("Error cargando checkins:", error);
      }

      checkinData = data || [];
    }

    if (batchIds.length > 0) {
      const { data, error } = await (supabase as any)
        .from("ticket_batches")
        .select("id,event_id,name,batch_order,price,rrpp_commission,stock,sold_count,active,created_at")
        .in("id", batchIds);

      if (error) {
        console.error("Error cargando tandas:", error);
      }

      batchData = data || [];
    }

    setGuests(safeGuests);
    setTickets(safeTickets);
    setEvents(eventData);
    setCheckins(checkinData);
    setTicketBatches(batchData);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [profile?.id, user?.id]);

  const eventMap = useMemo(() => {
    const map = new Map();
    events.forEach((e) => map.set(e.id, e));
    return map;
  }, [events]);

  const batchMap = useMemo(() => {
    const map = new Map();
    ticketBatches.forEach((b) => map.set(b.id, b));
    return map;
  }, [ticketBatches]);

  const checkinMap = useMemo(() => {
    const map = new Map();
    checkins.forEach((c) => {
      if (c.registration_id) {
        map.set(c.registration_id, c);
      }
    });
    return map;
  }, [checkins]);

  const monthOptions = useMemo(() => {
    const months = new Set<string>();

    guests.forEach((g) => {
      const event = eventMap.get(g.event_id);
      const key = getMonthKey(event?.event_date || event?.created_at || g.created_at);
      if (key) months.add(key);
    });

    tickets.forEach((t) => {
      const event = eventMap.get(t.event_id);
      const key = getMonthKey(event?.event_date || event?.created_at || t.created_at);
      if (key) months.add(key);
    });

    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [guests, tickets, eventMap]);

  useEffect(() => {
    if (!selectedMonth && monthOptions.length > 0) {
      setSelectedMonth(monthOptions[0]);
    }
  }, [monthOptions, selectedMonth]);

  const filteredGuests = useMemo(() => {
    return guests.filter((g) => {
      const event = eventMap.get(g.event_id);
      const monthKey = getMonthKey(event?.event_date || event?.created_at || g.created_at);
      return monthKey === selectedMonth;
    });
  }, [guests, eventMap, selectedMonth]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const event = eventMap.get(t.event_id);
      const monthKey = getMonthKey(event?.event_date || event?.created_at || t.created_at);
      return monthKey === selectedMonth;
    });
  }, [tickets, eventMap, selectedMonth]);

  const grouped = useMemo(() => {
    const map = new Map();

    filteredGuests.forEach((g) => {
      const event = eventMap.get(g.event_id);
      const key = g.event_id || "sin-evento";
      const checkin = checkinMap.get(g.id);
      const didEnter = Boolean(checkin) || g.registration_status === "checked_in";

      if (!map.has(key)) {
        map.set(key, {
          event_id: key,
          name: event?.name || "Evento sin nombre",
          event_date: event?.event_date || event?.created_at || g.created_at || "",
          anotados: 0,
          ingresaron: 0,
          pendientes: 0,
          ganancia: 0,
          guests: [],
        });
      }

      const item = map.get(key);

      item.anotados += 1;
      item.guests.push({
        ...g,
        didEnter,
        checked_in_at: checkin?.checked_in_at || null,
      });

      if (didEnter) {
        item.ingresaron += 1;
      } else {
        item.pendientes += 1;
      }

      item.ganancia = item.ingresaron * PAY_PER_ENTRY;
    });

    return Array.from(map.values()).sort((a, b) => {
      return new Date(b.event_date).getTime() - new Date(a.event_date).getTime();
    });
  }, [filteredGuests, eventMap, checkinMap]);

  const ticketGrouped = useMemo(() => {
    const map = new Map();

    filteredTickets.forEach((ticket) => {
      const event = eventMap.get(ticket.event_id);
      const batch = batchMap.get(ticket.batch_id);
      const key = ticket.event_id || "sin-evento";
      const didEnter = Boolean(ticket.entry_used_at);
      const commission = Number(ticket.rrpp_commission || 0);
      const price = Number(ticket.price || 0);

      if (!map.has(key)) {
        map.set(key, {
          event_id: key,
          name: event?.name || "Evento sin nombre",
          event_date: event?.event_date || event?.created_at || ticket.created_at || "",
          vendidas: 0,
          ingresaron: 0,
          pendientes: 0,
          recaudado: 0,
          comision: 0,
          tickets: [],
        });
      }

      const item = map.get(key);
      item.vendidas += 1;
      item.recaudado += price;
      item.comision += commission;

      if (didEnter) item.ingresaron += 1;
      else item.pendientes += 1;

      item.tickets.push({
        ...ticket,
        didEnter,
        batch_name: batch?.name || "Anticipada",
        commission,
        price,
      });
    });

    return Array.from(map.values()).sort((a, b) => {
      return new Date(b.event_date).getTime() - new Date(a.event_date).getTime();
    });
  }, [filteredTickets, eventMap, batchMap]);

  const totalIngresaron = filteredGuests.filter((g) => {
    return Boolean(checkinMap.get(g.id)) || g.registration_status === "checked_in";
  }).length;

  const totalAnotados = filteredGuests.length;
  const totalGanancia = totalIngresaron * PAY_PER_ENTRY;
  const totalEventosMes = grouped.length;

  const totalTicketsVendidos = filteredTickets.length;
  const totalTicketsIngresaron = filteredTickets.filter((t) => t.entry_used_at).length;
  const totalTicketsPendientes = totalTicketsVendidos - totalTicketsIngresaron;
  const totalTicketsComision = filteredTickets.reduce((acc, t) => acc + Number(t.rrpp_commission || 0), 0);
  const totalTicketsRecaudado = filteredTickets.reduce((acc, t) => acc + Number(t.price || 0), 0);

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-4 py-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-zinc-950 p-5">
          Cargando rendimientos...
        </div>
      </main>
    );
  }

  if (!rrpp) {
    return (
      <main className="min-h-screen bg-black px-4 py-6 text-white">
        <div className="rounded-3xl border border-red-500/30 bg-red-950/30 p-5">
          No encontré tu perfil RRPP.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-5 pb-24 text-white">
      <div className="mx-auto max-w-md space-y-4">
        <section className="rounded-[1.75rem] border border-fuchsia-500/30 bg-zinc-950 p-5 shadow-[0_0_40px_rgba(217,70,239,0.14)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-fuchsia-300">
            HOLY RRPP
          </p>

          <h1 className="mt-2 text-2xl font-black leading-none">MIS RENDIMIENTOS</h1>

          <p className="mt-2 text-sm text-zinc-400">
            {rrpp.display_name} · lista free + anticipadas
          </p>
        </section>

        <section className="rounded-[1.5rem] border border-white/10 bg-zinc-950 p-3">
          <p className="px-1 pb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-fuchsia-300">
            Mes
          </p>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-fuchsia-500/40"
          >
            {monthOptions.length === 0 ? (
              <option value="">Sin meses</option>
            ) : (
              monthOptions.map((month) => (
                <option key={month} value={month} className="bg-black text-white">
                  {formatMonthLabel(month)}
                </option>
              ))
            )}
          </select>
        </section>

        <section className="grid grid-cols-2 gap-2 rounded-[1.5rem] border border-white/10 bg-zinc-950 p-2">
          <button
            onClick={() => setActiveTab("free")}
            className={
              activeTab === "free"
                ? "rounded-2xl bg-fuchsia-400 px-3 py-3 text-xs font-black uppercase tracking-[0.14em] text-black"
                : "rounded-2xl bg-black px-3 py-3 text-xs font-black uppercase tracking-[0.14em] text-zinc-400"
            }
          >
            Lista free
          </button>

          <button
            onClick={() => setActiveTab("anticipadas")}
            className={
              activeTab === "anticipadas"
                ? "rounded-2xl bg-yellow-400 px-3 py-3 text-xs font-black uppercase tracking-[0.14em] text-black"
                : "rounded-2xl bg-black px-3 py-3 text-xs font-black uppercase tracking-[0.14em] text-zinc-400"
            }
          >
            Anticipadas
          </button>
        </section>

        {activeTab === "free" ? (
          <>
            <section className="grid grid-cols-2 gap-2">
              <Card title="Eventos" value={totalEventosMes} purple />
              <Card title="Anotados" value={totalAnotados} />
              <Card title="Ingresaron" value={totalIngresaron} green />
              <Card title="Ganancia" value={money(totalGanancia)} gold />
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-black text-fuchsia-300">
                Lista free · {formatMonthLabel(selectedMonth)}
              </h2>

              {grouped.length === 0 ? (
                <EmptyBox text="No tenés invitados cargados en este mes." />
              ) : (
                grouped.map((item) => {
                  const conversion =
                    item.anotados > 0
                      ? Math.round((item.ingresaron / item.anotados) * 100)
                      : 0;

                  return (
                    <details
                      key={item.event_id}
                      className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-zinc-950"
                    >
                      <summary className="cursor-pointer list-none p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-base font-black">{item.name}</p>
                            <p className="mt-1 text-xs text-zinc-400">
                              {formatEventDate(item.event_date)} · {item.ingresaron}/{item.anotados} ingresos
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-lg font-black text-emerald-300">
                              {money(item.ganancia)}
                            </p>
                            <p className="text-[10px] text-zinc-500">{conversion}% conv.</p>
                          </div>
                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-fuchsia-400"
                            style={{ width: `${Math.min(conversion, 100)}%` }}
                          />
                        </div>
                      </summary>

                      <div className="border-t border-white/10 p-4">
                        <div className="mb-4 grid grid-cols-3 gap-2 text-center">
                          <Mini label="Anotados" value={item.anotados} />
                          <Mini label="Entraron" value={item.ingresaron} />
                          <Mini label="Pend." value={item.pendientes} />
                        </div>

                        <div className="max-h-[360px] overflow-auto rounded-2xl border border-white/10">
                          {item.guests.map((g, i) => (
                            <div
                              key={g.id}
                              className="flex items-center justify-between gap-3 border-b border-white/5 px-3 py-2.5 last:border-b-0"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold">
                                  {i + 1}. {`${g.first_name || ""} ${g.last_name || ""}`.trim() || "Sin nombre"}
                                </p>
                                <p className="text-xs text-zinc-500">DNI {g.dni_last3 || "---"}</p>
                              </div>

                              <StatusPill ok={g.didEnter} okText="INGRESÓ" idleText="PENDIENTE" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </details>
                  );
                })
              )}
            </section>
          </>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-2">
              <Card title="Vendidas" value={totalTicketsVendidos} gold />
              <Card title="Entraron" value={totalTicketsIngresaron} green />
              <Card title="Pendientes" value={totalTicketsPendientes} />
              <Card title="Comisión" value={money(totalTicketsComision)} gold />
            </section>

            <section className="rounded-[1.5rem] border border-yellow-400/20 bg-yellow-400/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">
                Resumen anticipadas
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <MiniMoney label="Recaudado" value={totalTicketsRecaudado} />
                <MiniMoney label="Tu comisión" value={totalTicketsComision} />
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-black text-yellow-300">
                Ventas · {formatMonthLabel(selectedMonth)}
              </h2>

              {ticketGrouped.length === 0 ? (
                <EmptyBox text="Todavía no tenés anticipadas vendidas en este mes." />
              ) : (
                ticketGrouped.map((item) => {
                  const conversion =
                    item.vendidas > 0
                      ? Math.round((item.ingresaron / item.vendidas) * 100)
                      : 0;

                  return (
                    <details
                      key={item.event_id}
                      className="overflow-hidden rounded-[1.5rem] border border-yellow-400/15 bg-zinc-950"
                    >
                      <summary className="cursor-pointer list-none p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-base font-black">{item.name}</p>
                            <p className="mt-1 text-xs text-zinc-400">
                              {formatEventDate(item.event_date)} · {item.vendidas} vendidas
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-lg font-black text-yellow-300">
                              {money(item.comision)}
                            </p>
                            <p className="text-[10px] text-zinc-500">comisión</p>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <Mini label="Vend." value={item.vendidas} />
                          <Mini label="Entraron" value={item.ingresaron} />
                          <Mini label="Pend." value={item.pendientes} />
                        </div>
                      </summary>

                      <div className="border-t border-white/10 p-4">
                        <div className="mb-4 rounded-2xl border border-white/10 bg-black p-3">
                          <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                            <span>Ingreso de anticipadas</span>
                            <span>{conversion}%</span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                            <div
                              className="h-full rounded-full bg-yellow-400"
                              style={{ width: `${Math.min(conversion, 100)}%` }}
                            />
                          </div>
                        </div>

                        <div className="max-h-[380px] overflow-auto rounded-2xl border border-white/10">
                          {item.tickets.map((t, i) => (
                            <div
                              key={t.id}
                              className="border-b border-white/5 px-3 py-3 last:border-b-0"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-black">
                                    {i + 1}. {`${t.buyer_first_name || ""} ${t.buyer_last_name || ""}`.trim() || "Sin nombre"}
                                  </p>
                                  <p className="mt-1 text-xs text-zinc-500">
                                    {t.batch_name} · DNI {t.buyer_dni || "---"}
                                  </p>
                                </div>

                                <StatusPill ok={t.didEnter} okText="ENTRÓ" idleText="VÁLIDA" />
                              </div>

                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <div className="rounded-xl bg-black p-2">
                                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">Precio</p>
                                  <p className="text-sm font-black text-emerald-300">{money(t.price)}</p>
                                </div>
                                <div className="rounded-xl bg-black p-2">
                                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">Comisión</p>
                                  <p className="text-sm font-black text-yellow-300">{money(t.commission)}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </details>
                  );
                })
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Card({ title, value, green, gold, purple }: any) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950 p-3 text-center">
      <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
        {title}
      </p>
      <p
        className={`mt-2 text-xl font-black ${
          green
            ? "text-emerald-300"
            : gold
              ? "text-yellow-300"
              : purple
                ? "text-fuchsia-300"
                : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Mini({ label, value }: any) {
  return (
    <div className="rounded-xl bg-black p-2 text-center">
      <p className="text-[10px] text-zinc-500">{label}</p>
      <p className="text-lg font-black">{value}</p>
    </div>
  );
}

function MiniMoney({ label, value }: any) {
  return (
    <div className="rounded-xl bg-black p-3">
      <p className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-black text-yellow-300">{money(value)}</p>
    </div>
  );
}

function EmptyBox({ text }: any) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-zinc-950 p-5 text-sm text-zinc-400">
      {text}
    </div>
  );
}

function StatusPill({ ok, okText, idleText }: any) {
  return (
    <span
      className={
        ok
          ? "shrink-0 rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-black text-emerald-300"
          : "shrink-0 rounded-full bg-zinc-800 px-2 py-1 text-[10px] font-black text-zinc-300"
      }
    >
      {ok ? okText : idleText}
    </span>
  );
}
