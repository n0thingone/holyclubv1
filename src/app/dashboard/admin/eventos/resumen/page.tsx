"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashboardShell from "@/components/navigation/DashboardShell";
import { getSupabaseClient } from "@/lib/supabase/client";
import { toPng } from "html-to-image";
import {
  RefreshCw,
  Download,
  Copy,
  CalendarDays,
  Clock3,
  Trophy,
  Ticket,
  Gift,
  ShieldAlert,
  Coins,
  ChevronDown,
  ChevronUp,
  Wine,
  Users,
  Sparkles,
} from "lucide-react";

type EventRow = {
  id: string;
  name: string | null;
  event_date?: string | null;
  status?: string | null;
  is_active?: boolean | null;
  is_closed?: boolean | null;
  created_at?: string | null;
  closed_at?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  event_end_at?: string | null;
};

type GuestRow = {
  id: string;
  event_id: string;
  rrpp_id: string | null;
  registration_status: string | null;
  created_at?: string | null;
};

type CheckinRow = {
  id: string;
  event_id: string;
  registration_id: string | null;
  rrpp_id: string | null;
  result: string | null;
  checked_in_at?: string | null;
};

type RrppRow = {
  id: string;
  display_name: string | null;
  active?: boolean | null;
};

type RedemptionRow = {
  id: string;
  event_id: string | null;
  reward_id: string | null;
  status: string | null;
  redeemed_at?: string | null;
  qr_token?: string | null;
};

type RewardRow = {
  id: string;
  name?: string | null;
  description?: string | null;
};

type RrppEventRewardRow = {
  id: string;
  event_id: string;
  rrpp_id: string | null;
  reward_type: string | null;
  title: string | null;
  trigger_count?: number | null;
  status: string | null;
  issued_at?: string | null;
  expires_at?: string | null;
  redeemed_at?: string | null;
  redeemed_by?: string | null;
};

type RrppPayRow = {
  rrpp_id: string;
  name: string;
  anotados: number;
  ingresaron: number;
  pendientes: number;
  pago: number;
};

type ItemCount = {
  item: string;
  cantidad: number;
};

type RrppConsumption = {
  rrpp: string;
  title: string;
  status: string;
  redeemed_at?: string | null;
};

const PAY_PER_ENTRY = 1000;

function isRedeemed(status?: string | null) {
  return ["redeemed", "used", "claimed"].includes(String(status || "").toLowerCase());
}

function isValidCheckin(result?: string | null) {
  const normalized = String(result || "").toLowerCase();
  if (!normalized) return true;
  return ["success", "ok", "valid", "checked_in", "allowed"].includes(normalized);
}

function isInvalidCheckin(result?: string | null) {
  const normalized = String(result || "").toLowerCase();
  if (!normalized) return false;
  return !isValidCheckin(normalized);
}

function safeMoney(value: number) {
  return `$${Number(value || 0).toLocaleString("es-AR")}`;
}

function formatDate(date?: string | null) {
  if (!date) return "Sin fecha";
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(date?: string | null) {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(time?: string | null) {
  if (!time) return "--:--";
  return String(time).slice(0, 5);
}

export default function AdminResumenEventoPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [eventData, setEventData] = useState<EventRow | null>(null);

  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [rrpps, setRrpps] = useState<RrppRow[]>([]);
  const [barItems, setBarItems] = useState<ItemCount[]>([]);
  const [rrppRewards, setRrppRewards] = useState<RrppEventRewardRow[]>([]);

  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const [openRrpp, setOpenRrpp] = useState(true);
  const [openCanjes, setOpenCanjes] = useState(false);
  const [openConsumiciones, setOpenConsumiciones] = useState(false);
  const [openPremios, setOpenPremios] = useState(false);

  const exportRef = useRef<HTMLDivElement | null>(null);

  const loadEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from("events")
      .select("id,name,event_date,status,is_active,is_closed,created_at,closed_at,start_time,end_time,event_end_at")
      .order("event_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows = (data || []) as EventRow[];
    setEvents(rows);

    const activeOrLatest =
      rows.find((ev) => ev.is_active || ev.status === "active") || rows[0] || null;

    setSelectedEventId((current) => current || activeOrLatest?.id || "");
  }, [supabase]);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      if (events.length === 0) {
        await loadEvents();
        setLoading(false);
        return;
      }

      if (!selectedEventId) {
        setEventData(null);
        setLoading(false);
        return;
      }

      const selected = events.find((ev) => ev.id === selectedEventId) || null;
      setEventData(selected);

      const [guestRes, checkinRes, rrppRes, redemptionRes, rrppRewardRes] = await Promise.all([
        supabase
          .from("guest_registrations")
          .select("id,event_id,rrpp_id,registration_status,created_at")
          .eq("event_id", selectedEventId),

        supabase
          .from("checkins")
          .select("id,event_id,registration_id,rrpp_id,result,checked_in_at")
          .eq("event_id", selectedEventId),

        supabase
          .from("rrpp_profiles")
          .select("id,display_name,active")
          .order("display_name", { ascending: true }),

        supabase
          .from("holy_redemptions")
          .select("id,event_id,reward_id,status,redeemed_at,qr_token")
          .eq("event_id", selectedEventId)
          .eq("status", "redeemed"),

        supabase
          .from("rrpp_event_rewards")
          .select("id,event_id,rrpp_id,reward_type,title,trigger_count,status,issued_at,expires_at,redeemed_at,redeemed_by")
          .eq("event_id", selectedEventId),
      ]);

      if (guestRes.error) throw guestRes.error;
      if (checkinRes.error) throw checkinRes.error;
      if (rrppRes.error) throw rrppRes.error;
      if (redemptionRes.error) throw redemptionRes.error;
      if (rrppRewardRes.error) throw rrppRewardRes.error;

      const safeGuests = (guestRes.data || []) as GuestRow[];
      const safeCheckins = (checkinRes.data || []) as CheckinRow[];
      const safeRrpps = (rrppRes.data || []) as RrppRow[];
      const safeRedemptions = (redemptionRes.data || []) as RedemptionRow[];
      const safeRrppRewards = (rrppRewardRes.data || []) as RrppEventRewardRow[];

      setGuests(safeGuests);
      setCheckins(safeCheckins);
      setRrpps(safeRrpps);
      setRrppRewards(safeRrppRewards);

      const rewardIds = Array.from(
        new Set(safeRedemptions.map((r) => r.reward_id).filter(Boolean))
      ) as string[];

      let rewardsById = new Map<string, RewardRow>();

      if (rewardIds.length > 0) {
        const { data: rewardsData, error: rewardsError } = await supabase
          .from("holy_rewards")
          .select("id,name,description")
          .in("id", rewardIds);

        if (rewardsError) throw rewardsError;
        rewardsById = new Map((rewardsData || []).map((r: any) => [r.id, r]));
      }

      const groupedCanjes = new Map<string, number>();

      safeRedemptions
        .filter((r) => String(r.qr_token || "").startsWith("HOLY-REDEEM:"))
        .forEach((r) => {
          const reward = r.reward_id ? rewardsById.get(r.reward_id) : null;
          const item = reward?.name || reward?.description || "Premio sin nombre";
          groupedCanjes.set(item, (groupedCanjes.get(item) || 0) + 1);
        });

      setBarItems(
        Array.from(groupedCanjes.entries())
          .map(([item, cantidad]) => ({ item, cantidad }))
          .sort((a, b) => b.cantidad - a.cantidad)
      );
    } catch (err: any) {
      console.error("Error cargando resumen:", err);
      setErrorMessage(err?.message || "No se pudo cargar el resumen del evento.");
      setEventData(null);
      setGuests([]);
      setCheckins([]);
      setRrpps([]);
      setBarItems([]);
      setRrppRewards([]);
    } finally {
      setLoading(false);
    }
  }, [events, selectedEventId, supabase, loadEvents]);

  useEffect(() => {
    loadEvents().catch((err) => {
      console.error(err);
      setErrorMessage(err?.message || "No se pudieron cargar los eventos.");
      setLoading(false);
    });
  }, [loadEvents]);

  useEffect(() => {
    if (!selectedEventId) return;
    loadSummary();
  }, [selectedEventId, loadSummary]);

  const rrppMap = useMemo(() => {
    const map = new Map<string, RrppRow>();
    rrpps.forEach((rrpp) => map.set(rrpp.id, rrpp));
    return map;
  }, [rrpps]);

  const checkinRegistrationIds = useMemo(() => {
    const set = new Set<string>();
    checkins.forEach((c) => {
      if (c.registration_id && isValidCheckin(c.result)) set.add(c.registration_id);
    });
    return set;
  }, [checkins]);

  const payoutRows = useMemo<RrppPayRow[]>(() => {
    const grouped = new Map<string, RrppPayRow>();

    guests.forEach((guest) => {
      const key = guest.rrpp_id || "sin-rrpp";
      const rrpp = guest.rrpp_id ? rrppMap.get(guest.rrpp_id) : null;
      const name = rrpp?.display_name || "Sin RRPP";

      if (!grouped.has(key)) {
        grouped.set(key, {
          rrpp_id: key,
          name,
          anotados: 0,
          ingresaron: 0,
          pendientes: 0,
          pago: 0,
        });
      }

      const row = grouped.get(key)!;
      row.anotados += 1;

      const didEnter =
        checkinRegistrationIds.has(guest.id) || guest.registration_status === "checked_in";

      if (didEnter) row.ingresaron += 1;
      else row.pendientes += 1;

      row.pago = row.ingresaron * PAY_PER_ENTRY;
    });

    return Array.from(grouped.values()).sort((a, b) => b.ingresaron - a.ingresaron);
  }, [guests, rrppMap, checkinRegistrationIds]);

  const consumiciones = useMemo(() => {
    return rrppRewards.filter((r) => r.reward_type === "consumicion");
  }, [rrppRewards]);

  const consumicionesUsadas = useMemo<RrppConsumption[]>(() => {
    return consumiciones
      .filter((r) => isRedeemed(r.status))
      .map((r) => ({
        rrpp: (r.rrpp_id && rrppMap.get(r.rrpp_id)?.display_name) || "RRPP sin nombre",
        title: r.title || "Consumición FREE",
        status: r.status || "redeemed",
        redeemed_at: r.redeemed_at,
      }))
      .sort((a, b) => String(a.rrpp).localeCompare(String(b.rrpp)));
  }, [consumiciones, rrppMap]);

  const consumicionesPendientes = useMemo<RrppConsumption[]>(() => {
    return consumiciones
      .filter((r) => !isRedeemed(r.status))
      .map((r) => ({
        rrpp: (r.rrpp_id && rrppMap.get(r.rrpp_id)?.display_name) || "RRPP sin nombre",
        title: r.title || "Consumición FREE",
        status: r.status || "unlocked",
        redeemed_at: r.redeemed_at,
      }))
      .sort((a, b) => String(a.rrpp).localeCompare(String(b.rrpp)));
  }, [consumiciones, rrppMap]);

  const premiosRrpp = useMemo(() => {
    return rrppRewards
      .filter((r) => r.reward_type !== "consumicion")
      .map((r) => ({
        rrpp: (r.rrpp_id && rrppMap.get(r.rrpp_id)?.display_name) || "RRPP sin nombre",
        title: r.title || "Premio RRPP",
        type: r.reward_type || "premio",
        status: r.status || "—",
        redeemed_at: r.redeemed_at,
      }))
      .sort((a, b) => String(a.rrpp).localeCompare(String(b.rrpp)));
  }, [rrppRewards, rrppMap]);

  const totalAnotados = guests.length;
  const totalIngresaron = payoutRows.reduce((acc, row) => acc + row.ingresaron, 0);
  const totalPendientes = Math.max(0, totalAnotados - totalIngresaron);
  const totalInvalidos = checkins.filter((c) => isInvalidCheckin(c.result)).length;
  const totalCanjesBarra = barItems.reduce((acc, item) => acc + item.cantidad, 0);
  const totalConsumicionesEmitidas = consumiciones.length;
  const totalConsumicionesUsadas = consumicionesUsadas.length;
  const totalConsumicionesPendientes = consumicionesPendientes.length;
  const rrppQueConsumieron = new Set(consumicionesUsadas.map((c) => c.rrpp)).size;
  const totalAPagar = payoutRows.reduce((acc, row) => acc + row.pago, 0);
  const topRrpp = payoutRows.find((row) => row.rrpp_id !== "sin-rrpp" && row.ingresaron > 0);

  const statusLabel = useMemo(() => {
    if (!eventData) return "Sin evento";
    if (eventData.status === "closed" || eventData.is_closed) return "Cerrado";
    if (eventData.status === "active" || eventData.is_active) return "Activo";
    return "Inactivo";
  }, [eventData]);

  async function handleExportImage() {
    if (!exportRef.current || !eventData) return;

    try {
      setExporting(true);

      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#09090b",
      });

      const link = document.createElement("a");
      const eventName = String(eventData?.name || "evento")
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase();
      const eventDate = formatDate(eventData?.event_date).replace(/\//g, "-");

      link.download = `resumen-${eventName}-${eventDate}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      setErrorMessage("No pude generar la imagen del resumen.");
    } finally {
      setExporting(false);
    }
  }

  async function handleCopySummary() {
    if (!eventData) return;

    const text = [
      `Resumen evento: ${eventData?.name || "Sin nombre"}`,
      `Estado: ${statusLabel}`,
      `Fecha: ${formatDate(eventData?.event_date)}`,
      `Ingresos: ${totalIngresaron}`,
      `Anotados: ${totalAnotados}`,
      `Pendientes: ${totalPendientes}`,
      `Canjes barra: ${totalCanjesBarra}`,
      `Consumiciones RRPP usadas: ${totalConsumicionesUsadas}/${totalConsumicionesEmitidas}`,
      `RRPP que consumieron: ${rrppQueConsumieron}`,
      `Total a pagar RRPP: ${safeMoney(totalAPagar)}`,
      `Top RRPP: ${topRrpp?.name || "—"}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setInfoMessage("Resumen copiado al portapapeles.");
      setTimeout(() => setInfoMessage(""), 1800);
    } catch {
      setErrorMessage("No pude copiar el resumen.");
    }
  }

  return (
    <DashboardShell title="ADMIN · RESUMEN EVENTO">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">
              Holy Admin
            </div>
            <h1 className="mt-1 text-2xl font-black text-white">Resumen de evento</h1>
            <p className="mt-1 text-sm text-white/55">
              Operación, RRPP, canjes, consumiciones y liquidación.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadSummary}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
              Recargar
            </button>

            <button
              onClick={handleCopySummary}
              disabled={!eventData}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              <Copy className="h-4 w-4" />
              Copiar
            </button>

            <button
              onClick={handleExportImage}
              disabled={!eventData || exporting}
              className="inline-flex items-center gap-2 rounded-2xl bg-fuchsia-500 px-4 py-3 text-sm font-black text-white transition hover:bg-fuchsia-400 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Generando..." : "Guardar imagen"}
            </button>
          </div>
        </div>

        <div className="mb-5 rounded-[28px] border border-white/10 bg-white/5 p-4">
          <label className="text-[11px] font-black uppercase tracking-[0.24em] text-fuchsia-300">
            Seleccionar evento
          </label>

          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="mt-3 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-fuchsia-400/50"
          >
            {events.length === 0 ? (
              <option value="">Sin eventos</option>
            ) : (
              events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name || "Evento sin nombre"} · {formatDate(ev.event_date)}
                </option>
              ))
            )}
          </select>
        </div>

        {!!infoMessage && (
          <div className="mb-4 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-3 text-sm text-fuchsia-200">
            {infoMessage}
          </div>
        )}

        {!!errorMessage && (
          <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-white/70">
            Cargando resumen...
          </div>
        ) : !eventData ? (
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-white/70">
            No hay datos para mostrar.
          </div>
        ) : (
          <div className="space-y-5">
            <SummaryContent
              eventData={eventData}
              statusLabel={statusLabel}
              totalAnotados={totalAnotados}
              totalIngresaron={totalIngresaron}
              totalPendientes={totalPendientes}
              totalInvalidos={totalInvalidos}
              totalCanjesBarra={totalCanjesBarra}
              totalConsumicionesEmitidas={totalConsumicionesEmitidas}
              totalConsumicionesUsadas={totalConsumicionesUsadas}
              totalConsumicionesPendientes={totalConsumicionesPendientes}
              rrppQueConsumieron={rrppQueConsumieron}
              totalAPagar={totalAPagar}
              topRrpp={topRrpp}
            />

            <ExpandableSection
              title="Liquidación RRPP"
              subtitle="Ingresos reales por RRPP y monto a pagar."
              open={openRrpp}
              onToggle={() => setOpenRrpp((v) => !v)}
            >
              <RrppPayoutTable rows={payoutRows} />
            </ExpandableSection>

            <ExpandableSection
              title="Canjes barra"
              subtitle="Canjes normales de clientes / beneficios canjeados en barra."
              open={openCanjes}
              onToggle={() => setOpenCanjes((v) => !v)}
            >
              <ItemList items={barItems} empty="Sin canjes en barra para este evento." />
            </ExpandableSection>

            <ExpandableSection
              title="Consumiciones RRPP"
              subtitle="Consumición única por evento de cada RRPP."
              open={openConsumiciones}
              onToggle={() => setOpenConsumiciones((v) => !v)}
            >
              <div className="grid gap-3 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
                    Usadas
                  </p>
                  <ConsumptionList items={consumicionesUsadas} empty="Ningún RRPP consumió todavía." />
                </div>
                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
                    Pendientes
                  </p>
                  <ConsumptionList items={consumicionesPendientes} empty="No hay pendientes." />
                </div>
              </div>
            </ExpandableSection>

            <ExpandableSection
              title="Premios / botellas RRPP"
              subtitle="Rewards especiales de RRPP separados de la consumición free."
              open={openPremios}
              onToggle={() => setOpenPremios((v) => !v)}
            >
              <SpecialRewardsList items={premiosRrpp} />
            </ExpandableSection>
          </div>
        )}

        {eventData ? (
          <div className="pointer-events-none fixed left-[-99999px] top-0">
            <div ref={exportRef} className="w-[1120px] bg-[#09090b] p-10 text-white">
              <div className="rounded-[32px] border border-fuchsia-400/20 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),rgba(0,0,0,0.96)_45%)] p-8 shadow-[0_0_50px_rgba(168,85,247,0.12)]">
                <ExportHeader eventData={eventData} statusLabel={statusLabel} />

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <ExportMetric label="Anotados" value={totalAnotados} />
                  <ExportMetric label="Ingresaron" value={totalIngresaron} green />
                  <ExportMetric label="Pendientes" value={totalPendientes} />
                  <ExportMetric label="Canjes barra" value={totalCanjesBarra} />
                  <ExportMetric label="Consumiciones usadas" value={`${totalConsumicionesUsadas}/${totalConsumicionesEmitidas}`} />
                  <ExportMetric label="RRPP consumieron" value={rrppQueConsumieron} />
                </div>

                <div className="mt-8 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-6">
                  <p className="text-sm font-bold uppercase tracking-[0.28em] text-emerald-300">
                    Total a pagar RRPP
                  </p>
                  <p className="mt-2 text-5xl font-black text-emerald-400">
                    {safeMoney(totalAPagar)}
                  </p>
                </div>

                <ExportBlock title="Liquidación RRPP">
                  <RrppPayoutTable rows={payoutRows} exportMode />
                </ExportBlock>

                <ExportBlock title="Canjes barra">
                  <ItemList items={barItems} empty="Sin canjes en barra." exportMode />
                </ExportBlock>

                <ExportBlock title="Consumiciones RRPP usadas">
                  <ConsumptionList items={consumicionesUsadas} empty="Ningún RRPP consumió." exportMode />
                </ExportBlock>

                {premiosRrpp.length > 0 ? (
                  <ExportBlock title="Premios / botellas RRPP">
                    <SpecialRewardsList items={premiosRrpp} exportMode />
                  </ExportBlock>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardShell>
  );
}

function ExportHeader({ eventData, statusLabel }: any) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-bold uppercase tracking-[0.35em] text-fuchsia-300">
          HOLY CLUB · RESUMEN
        </div>
        <div className="mt-3 text-4xl font-black text-white">
          {eventData?.name || "Sin nombre"}
        </div>
        <div className="mt-2 text-lg text-zinc-400">
          {formatDate(eventData?.event_date)} · {formatTime(eventData?.start_time)} - {formatTime(eventData?.end_time)}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-white/70">
        {statusLabel}
      </div>
    </div>
  );
}

function SummaryContent(props: any) {
  const {
    eventData,
    statusLabel,
    totalAnotados,
    totalIngresaron,
    totalPendientes,
    totalInvalidos,
    totalCanjesBarra,
    totalConsumicionesEmitidas,
    totalConsumicionesUsadas,
    rrppQueConsumieron,
    totalAPagar,
    topRrpp,
  } = props;

  return (
    <div className="rounded-[32px] border border-fuchsia-400/20 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),rgba(0,0,0,0.96)_45%)] p-6 shadow-[0_0_50px_rgba(168,85,247,0.12)]">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">
            HOLY CLUB · RESUMEN
          </div>
          <div className="mt-2 text-3xl font-black text-white">
            {eventData?.name || "Sin nombre"}
          </div>
          <div className="mt-2 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white/70">
            {statusLabel}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/30 px-4 py-3 text-right">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/45">Evento ID</div>
          <div className="mt-1 max-w-[220px] truncate text-sm font-bold text-white">
            {eventData?.id}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard icon={<CalendarDays className="h-4 w-4" />} label="Fecha" value={formatDate(eventData?.event_date)} />
        <InfoCard icon={<Clock3 className="h-4 w-4" />} label="Horario" value={`${formatTime(eventData?.start_time)} · ${formatTime(eventData?.end_time)}`} />
        <InfoCard label="Creado" value={formatDateTime(eventData?.created_at)} small />
        <InfoCard label="Cerrado" value={formatDateTime(eventData?.closed_at)} small />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard icon={<Trophy className="h-5 w-5 text-fuchsia-300" />} label="Total ingresos" value={totalIngresaron} />
        <MetricCard icon={<Ticket className="h-5 w-5 text-fuchsia-300" />} label="Anotados" value={totalAnotados} />
        <MetricCard icon={<Clock3 className="h-5 w-5 text-fuchsia-300" />} label="Pendientes" value={totalPendientes} />
        <MetricCard icon={<Gift className="h-5 w-5 text-fuchsia-300" />} label="Canjes barra" value={totalCanjesBarra} />
        <MetricCard icon={<Wine className="h-5 w-5 text-fuchsia-300" />} label="Consumiciones RRPP" value={`${totalConsumicionesUsadas}/${totalConsumicionesEmitidas}`} />
        <MetricCard icon={<ShieldAlert className="h-5 w-5 text-fuchsia-300" />} label="Inválidos" value={totalInvalidos} />
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        <BigInfo label="Top RRPP" value={topRrpp?.name || "—"} sub={topRrpp ? `${topRrpp.ingresaron} ingresos` : "Sin datos"} />
        <BigInfo label="RRPP que consumieron" value={rrppQueConsumieron} sub="Consumición única" />
        <BigInfo label="Total a pagar" value={safeMoney(totalAPagar)} sub="$1000 x ingreso" green />
      </div>
    </div>
  );
}

function ExpandableSection({ title, subtitle, open, onToggle, children }: any) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-white/[0.03]"
      >
        <div>
          <h2 className="text-lg font-black text-white">{title}</h2>
          <p className="mt-1 text-sm text-white/50">{subtitle}</p>
        </div>
        <span className="rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-2 text-fuchsia-200">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {open ? <div className="border-t border-white/10 p-5">{children}</div> : null}
    </section>
  );
}

function RrppPayoutTable({ rows, exportMode = false }: { rows: RrppPayRow[]; exportMode?: boolean }) {
  const filteredRows = rows.filter((row) => row.rrpp_id !== "sin-rrpp" && row.ingresaron > 0);

  if (filteredRows.length === 0) {
    return <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white/50">Sin ingresos RRPP.</div>;
  }

  return (
    <div className="space-y-2">
      {filteredRows.map((row, index) => (
        <div
          key={row.rrpp_id}
          className={`${exportMode ? "grid grid-cols-[1.5fr_0.6fr_0.8fr]" : "flex items-center justify-between"} gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3`}
        >
          <div>
            <p className={exportMode ? "text-xl font-black text-white" : "font-black text-white"}>
              {index + 1}. {row.name}
            </p>
            {!exportMode ? <p className="text-sm text-white/45">{row.anotados} anotados</p> : null}
          </div>

          <p className={exportMode ? "text-center text-xl font-black text-white" : "text-right text-sm font-bold text-white/70"}>
            {row.ingresaron} ingresos
          </p>

          <p className={exportMode ? "text-right text-xl font-black text-emerald-400" : "text-right text-lg font-black text-emerald-400"}>
            {safeMoney(row.pago)}
          </p>
        </div>
      ))}
    </div>
  );
}

function ItemList({ items, empty, exportMode = false }: { items: ItemCount[]; empty: string; exportMode?: boolean }) {
  if (items.length === 0) {
    return <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white/50">{empty}</div>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.item} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
          <span className={exportMode ? "text-xl font-black text-white" : "font-bold text-white"}>{item.item}</span>
          <span className={exportMode ? "text-xl font-black text-fuchsia-300" : "font-black text-fuchsia-300"}>x{item.cantidad}</span>
        </div>
      ))}
    </div>
  );
}

function ConsumptionList({ items, empty, exportMode = false }: { items: RrppConsumption[]; empty: string; exportMode?: boolean }) {
  if (items.length === 0) {
    return <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white/50">{empty}</div>;
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={`${item.rrpp}-${item.title}-${index}`} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className={exportMode ? "text-xl font-black text-white" : "font-black text-white"}>{item.rrpp}</p>
              <p className="text-sm text-white/50">{item.title}</p>
            </div>
         <span
  className={
    isRedeemed(item.status)
      ? "rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-black uppercase text-emerald-300"
      : "rounded-full border border-yellow-400/30 bg-yellow-500/10 px-3 py-1 text-xs font-black uppercase text-yellow-300"
  }
>
  {isRedeemed(item.status) ? "Canjeada" : "Pendiente"}
</span>
          </div>
          {item.redeemed_at ? <p className="mt-2 text-xs text-white/40">{formatDateTime(item.redeemed_at)}</p> : null}
        </div>
      ))}
    </div>
  );
}

function SpecialRewardsList({ items, exportMode = false }: { items: any[]; exportMode?: boolean }) {
  if (items.length === 0) {
    return <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white/50">Sin premios especiales RRPP.</div>;
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={`${item.rrpp}-${item.title}-${index}`} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className={exportMode ? "text-xl font-black text-white" : "font-black text-white"}>{item.rrpp}</p>
              <p className="text-sm text-white/50">{item.title}</p>
            </div>
            <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-black uppercase text-amber-300">
              {item.status}
            </span>
          </div>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/35">{item.type}</p>
        </div>
      ))}
    </div>
  );
}

function InfoCard({ icon, label, value, small = false }: any) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
      <div className="flex items-center gap-2 text-white/50">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{label}</span>
      </div>
      <div className={small ? "mt-2 text-sm font-bold text-white" : "mt-2 text-lg font-black text-white"}>{value}</div>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
      <div className="flex items-center gap-2">
        {icon}
        <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/50">{label}</div>
      </div>
      <div className="mt-3 text-3xl font-black text-white">{typeof value === "number" ? value.toLocaleString("es-AR") : value}</div>
    </div>
  );
}

function BigInfo({ label, value, sub, green = false }: any) {
  return (
    <div className={`rounded-3xl border ${green ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/10 bg-black/30"} p-5`}>
      <div className={green ? "text-[11px] uppercase tracking-[0.24em] text-emerald-300" : "text-[11px] uppercase tracking-[0.24em] text-fuchsia-300"}>{label}</div>
      <div className={green ? "mt-2 text-2xl font-black text-emerald-400" : "mt-2 text-2xl font-black text-white"}>{value}</div>
      <div className="mt-1 text-sm text-white/50">{sub}</div>
    </div>
  );
}

function ExportMetric({ label, value, green = false }: { label: string; value: number | string; green?: boolean }) {
  return (
    <div className={`rounded-2xl border ${green ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/10 bg-black/30"} p-5`}>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/45">{label}</p>
      <p className={green ? "mt-2 text-3xl font-black text-emerald-400" : "mt-2 text-3xl font-black text-white"}>{typeof value === "number" ? value.toLocaleString("es-AR") : value}</p>
    </div>
  );
}

function ExportBlock({ title, children }: any) {
  return (
    <div className="mt-8">
      <h2 className="mb-3 text-2xl font-black text-fuchsia-300">{title}</h2>
      {children}
    </div>
  );
}
