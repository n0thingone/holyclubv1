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

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
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

export default function MisRendimientosPage() {
  const supabase = getSupabaseClient();
  const { profile, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [rrpp, setRrpp] = useState<any>(null);
  const [guests, setGuests] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());

  async function loadData() {
    setLoading(true);

    const profileId = profile?.id || user?.id;

    if (!profileId) {
      setLoading(false);
      return;
    }

    const { data: rrppData } = await supabase
      .from("rrpp_profiles")
      .select("*")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (!rrppData) {
      setLoading(false);
      return;
    }

    setRrpp(rrppData);

    const { data: guestData } = await supabase
      .from("guest_registrations")
      .select("id,event_id,first_name,last_name,dni_last3,registration_status,created_at")
      .eq("rrpp_id", rrppData.id)
      .order("created_at", { ascending: false });

    const eventIds = Array.from(
      new Set((guestData || []).map((g) => g.event_id).filter(Boolean))
    );

    let eventData: any[] = [];

    if (eventIds.length > 0) {
      const res = await supabase
        .from("events")
        .select("id,name,event_date,status,is_active,created_at")
        .in("id", eventIds);

      eventData = res.data || [];
    }

    setGuests(guestData || []);
    setEvents(eventData || []);
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

  const monthOptions = useMemo(() => {
    const months = new Set<string>();

    guests.forEach((g) => {
      const event = eventMap.get(g.event_id);
      const key = getMonthKey(event?.event_date || event?.created_at || g.created_at);
      if (key) months.add(key);
    });

    if (months.size === 0) months.add(getCurrentMonthKey());

    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [guests, eventMap]);

  const filteredGuests = useMemo(() => {
    return guests.filter((g) => {
      const event = eventMap.get(g.event_id);
      const monthKey = getMonthKey(event?.event_date || event?.created_at || g.created_at);
      return monthKey === selectedMonth;
    });
  }, [guests, eventMap, selectedMonth]);

  const grouped = useMemo(() => {
    const map = new Map();

    filteredGuests.forEach((g) => {
      const event = eventMap.get(g.event_id);
      const key = g.event_id || "sin-evento";

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
      item.guests.push(g);

      if (g.registration_status === "checked_in") {
        item.ingresaron += 1;
      } else {
        item.pendientes += 1;
      }

      item.ganancia = item.ingresaron * PAY_PER_ENTRY;
    });

    return Array.from(map.values()).sort((a, b) => {
      return new Date(b.event_date).getTime() - new Date(a.event_date).getTime();
    });
  }, [filteredGuests, eventMap]);

  const totalIngresaron = filteredGuests.filter(
    (g) => g.registration_status === "checked_in"
  ).length;

  const totalAnotados = filteredGuests.length;
  const totalGanancia = totalIngresaron * PAY_PER_ENTRY;
  const totalEventosMes = grouped.length;

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
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="rounded-3xl border border-fuchsia-500/30 bg-zinc-950 p-5 shadow-[0_0_40px_rgba(217,70,239,0.14)]">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-fuchsia-300">
            HOLY RRPP
          </p>

          <h1 className="mt-2 text-3xl font-black">MIS RENDIMIENTOS</h1>

          <p className="mt-1 text-sm text-zinc-400">
            {rrpp.display_name} · ${PAY_PER_ENTRY.toLocaleString("es-AR")} por ingreso
          </p>
        </section>

        <section className="rounded-3xl border border-white/10 bg-zinc-950 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-fuchsia-300">
                Filtro mensual
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                Mostrando eventos de {formatMonthLabel(selectedMonth)}
              </p>
            </div>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-fuchsia-500/40"
            >
              {monthOptions.map((month) => (
                <option key={month} value={month} className="bg-black text-white">
                  {formatMonthLabel(month)}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card title="Eventos" value={totalEventosMes} purple />
          <Card title="Anotados" value={totalAnotados} />
          <Card title="Ingresaron" value={totalIngresaron} green />
          <Card
            title="Ganancia"
            value={`$${totalGanancia.toLocaleString("es-AR")}`}
            gold
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-fuchsia-300">
            Eventos de {formatMonthLabel(selectedMonth)}
          </h2>

          {grouped.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-zinc-950 p-5 text-zinc-400">
              No tenés invitados cargados en este mes.
            </div>
          ) : (
            grouped.map((item) => {
              const conversion =
                item.anotados > 0
                  ? Math.round((item.ingresaron / item.anotados) * 100)
                  : 0;

              return (
                <details
                  key={item.event_id}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-950"
                >
                  <summary className="cursor-pointer list-none p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-black">{item.name}</p>
                        <p className="text-sm text-zinc-400">
                          {formatEventDate(item.event_date)} · {item.ingresaron} ingresos / {item.anotados} anotados
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xl font-black text-emerald-300">
                          ${item.ganancia.toLocaleString("es-AR")}
                        </p>
                        <p className="text-xs text-zinc-500">{conversion}% conv.</p>
                      </div>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-fuchsia-400"
                        style={{ width: `${conversion}%` }}
                      />
                    </div>
                  </summary>

                  <div className="border-t border-white/10 p-4">
                    <div className="mb-4 grid grid-cols-3 gap-2 text-center">
                      <Mini label="Anotados" value={item.anotados} />
                      <Mini label="Ingresaron" value={item.ingresaron} />
                      <Mini label="Pendientes" value={item.pendientes} />
                    </div>

                    <div className="max-h-[360px] overflow-auto rounded-2xl border border-white/10">
                      {item.guests.map((g, i) => (
                        <div
                          key={g.id}
                          className="flex items-center justify-between gap-3 border-b border-white/5 px-3 py-2 last:border-b-0"
                        >
                          <div>
                            <p className="text-sm font-bold">
                              {i + 1}.{" "}
                              {`${g.first_name || ""} ${g.last_name || ""}`.trim() ||
                                "Sin nombre"}
                            </p>
                            <p className="text-xs text-zinc-500">
                              DNI {g.dni_last3 || "---"}
                            </p>
                          </div>

                          <span
                            className={
                              g.registration_status === "checked_in"
                                ? "rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-black text-emerald-300"
                                : "rounded-full bg-zinc-800 px-2 py-1 text-xs font-black text-zinc-300"
                            }
                          >
                            {g.registration_status === "checked_in"
                              ? "INGRESÓ"
                              : "PENDIENTE"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}

function Card({ title, value, green, gold, purple }: any) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4 text-center">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        {title}
      </p>
      <p
        className={`mt-2 text-2xl font-black ${
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
    <div className="rounded-xl bg-black p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-xl font-black">{value}</p>
    </div>
  );
}
