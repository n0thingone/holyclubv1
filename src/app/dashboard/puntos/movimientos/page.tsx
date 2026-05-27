"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Clock3,
  QrCode as QrCodeIcon,
  CheckCircle2,
  AlertCircle,
  Gift,
  Lock,
  Crown,
  Ticket,
  Sparkles,
  ShieldCheck,
  Trophy,
  Wine,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import QRCode from "react-qr-code";
import { useSearchParams } from "next/navigation";
import DashboardShell from "@/components/navigation/DashboardShell";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

type Movement = {
  id: string;
  amount: number;
  type: string | null;
  description: string | null;
  created_at: string;
};

type Redemption = {
  id: string;
  reward_id: string;
  qr_token: string;
  short_token: string;
  status: "pending" | "used" | "redeemed" | "expired";
  expires_at: string | null;
  redeemed_at: string | null;
  created_at: string;
  points_cost: number | null;
  holy_rewards?: {
    name: string | null;
  } | null;
};

type Reward = {
  id: string;
  name: string;
};

type EntryQR = {
  id: string;
  qr_token: string;
  registration_status: string | null;
  entry_points_awarded: boolean | null;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  events: {
    id: string;
    name: string;
    event_date: string;
    qr_entry_until: string | null;
    registration_until: string | null;
  } | null;
  rrpp_profiles: {
    id: string;
    display_name: string | null;
    slug: string | null;
  } | null;
};

type FeedItem =
  | {
      id: string;
      kind: "movement";
      created_at: string;
      title: string;
      subtitle: string;
      amount: number;
      positive: boolean;
    }
  | {
      id: string;
      kind: "redemption_created";
      created_at: string;
      title: string;
      subtitle: string;
      amount: 0;
      positive: true;
    }
  | {
      id: string;
      kind: "redemption_redeemed";
      created_at: string;
      title: string;
      subtitle: string;
      amount: 0;
      positive: true;
    }
  | {
      id: string;
      kind: "redemption_expired";
      created_at: string;
      title: string;
      subtitle: string;
      amount: 0;
      positive: false;
    };

type ActiveTab = "entradas" | "canjes" | "movimientos";

function getIsGuest() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("holy_guest") === "true";
}

export default function MovimientosPage() {
  const supabase = getSupabaseClient();
  const { profile } = useAuth();
  const searchParams = useSearchParams();

  const [movements, setMovements] = useState<Movement[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [entryQRs, setEntryQRs] = useState<EntryQR[]>([]);
  const [rewardNames, setRewardNames] = useState<Record<string, string>>({});
  const [selectedQR, setSelectedQR] = useState<Redemption | null>(null);
  const [selectedEntryQR, setSelectedEntryQR] = useState<EntryQR | null>(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("entradas");
  const [vipOpen, setVipOpen] = useState(true);

  const userId = (profile as any)?.id;

  useEffect(() => {
    setIsGuest(getIsGuest());

    const savedVipOpen = localStorage.getItem("holy_vip_card_open");
    if (savedVipOpen !== null) {
      setVipOpen(savedVipOpen === "true");
    }
  }, []);

  function toggleVipOpen() {
    const next = !vipOpen;
    setVipOpen(next);
    localStorage.setItem("holy_vip_card_open", String(next));
  }

  useEffect(() => {
    const urlTab = searchParams.get("tab");

    if (urlTab === "canjes") {
      setActiveTab("canjes");
    } else if (urlTab === "movimientos") {
      setActiveTab("movimientos");
    } else {
      setActiveTab("entradas");
    }
  }, [searchParams]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isGuest) {
      setLoading(false);
      setMovements([]);
      setRedemptions([]);
      setEntryQRs([]);
      return;
    }

    if (!userId) return;

    void loadData();

    const interval = setInterval(() => {
      void loadData();
    }, 4000);

    return () => clearInterval(interval);
  }, [userId, isGuest]);

  async function loadData() {
    if (!userId || isGuest) return;

    try {
      setLoading(true);

      const [{ data: movs }, { data: reds }, { data: rewards }, { data: entries }] =
        await Promise.all([
          supabase
            .from("holy_points_movements")
            .select("id, amount, type, description, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(30),

          supabase
            .from("holy_redemptions")
            .select(`
              id,
              reward_id,
              qr_token,
              short_token,
              status,
              expires_at,
              redeemed_at,
              created_at,
              points_cost,
              holy_rewards (
                name
              )
            `)
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(100),

          supabase.from("holy_rewards").select("id,name"),

          supabase
            .from("guest_registrations")
            .select(`
              id,
              qr_token,
              registration_status,
              entry_points_awarded,
              created_at,
              first_name,
              last_name,
              events (
                id,
                name,
                event_date,
                qr_entry_until,
                registration_until
              ),
              rrpp_profiles (
                id,
                display_name,
                slug
              )
            `)
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(20),
        ]);

      setMovements(movs ?? []);
      setRedemptions(((reds ?? []) as unknown as Redemption[]) ?? []);
      setEntryQRs(((entries ?? []) as unknown as EntryQR[]) ?? []);

      const map: Record<string, string> = {};
      (rewards ?? []).forEach((r: Reward) => {
        map[r.id] = r.name;
      });
      setRewardNames(map);
    } catch (error) {
      console.error("Error cargando movimientos:", error);
    } finally {
      setLoading(false);
    }
  }

  function getRewardLabel(redemption: Redemption) {
    const joinedName = redemption.holy_rewards?.name;
    const mappedName = rewardNames[redemption.reward_id];

    if (joinedName && joinedName.trim()) return joinedName;
    if (mappedName && mappedName.trim()) return mappedName;

    return "PREMIO";
  }

  function formatDate(date: string | null) {
    if (!date) return "";
    return new Date(date).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatCountdown(ms: number) {
    if (ms <= 0) return "00:00";

    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;

    if (h > 0) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(
        2,
        "0"
      )}:${String(s).padStart(2, "0")}`;
    }

    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function formatCountdownText(ms: number) {
    if (ms <= 0) return "0m";

    const totalMinutes = Math.floor(ms / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  function isRedemptionUsed(status: Redemption["status"]) {
    return status === "used" || status === "redeemed";
  }

  function isQrOpen(stateKey: string) {
    return stateKey === "pending" || stateKey === "available";
  }

  function getEntryState(entry: EntryQR) {
    const rawStatus = String(entry.registration_status ?? "").toLowerCase();
    const entered =
      entry.entry_points_awarded === true ||
      ["checked_in", "entered", "used", "scanned", "redeemed"].includes(rawStatus);

    if (entered) {
      return {
        key: "entered" as const,
        label: "INGRESADO",
        shortLabel: "OK",
        color: "text-emerald-400",
        border: "border-emerald-500/20",
        rail: "from-emerald-400 to-emerald-600",
        glow: "shadow-[0_0_18px_rgba(16,185,129,0.40)]",
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        description: "Tu entrada ya fue validada en puerta.",
      };
    }

    const until = entry.events?.qr_entry_until
      ? new Date(entry.events.qr_entry_until).getTime()
      : null;

    if (until && until <= now) {
      return {
        key: "expired" as const,
        label: "VENCIDO",
        shortLabel: "VENC.",
        color: "text-rose-400",
        border: "border-rose-500/20",
        rail: "from-rose-400 to-red-600",
        glow: "shadow-[0_0_18px_rgba(244,63,94,0.40)]",
        icon: <AlertCircle className="h-3.5 w-3.5" />,
        description: "Tiempo de ingreso finalizado.",
      };
    }

    const left = until ? until - now : null;

    return {
      key: "pending" as const,
      label: "PENDIENTE",
      shortLabel: "QR ACTIVO",
      color: "text-amber-300",
      border: "border-amber-500/20",
      rail: "from-amber-300 to-yellow-500",
      glow: "shadow-[0_0_18px_rgba(250,204,21,0.38)]",
      icon: <Clock3 className="h-3.5 w-3.5" />,
      description: left
        ? `Tenés tiempo para ingresar: ${formatCountdownText(left)}`
        : "Entrada pendiente.",
    };
  }

  function getState(r: Redemption) {
    if (isRedemptionUsed(r.status)) {
      return {
        key: "redeemed" as const,
        label: "CANJEADO",
        shortLabel: "OK",
        color: "text-emerald-400",
        border: "border-emerald-500/18",
        rail: "from-emerald-400 to-emerald-600",
        glow: "shadow-[0_0_18px_rgba(16,185,129,0.40)]",
        pulse: "",
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      };
    }

    if (!r.expires_at) {
      return {
        key: "available" as const,
        label: "DISPONIBLE",
        shortLabel: "ACTIVO",
        color: "text-cyan-400",
        border: "border-cyan-500/18",
        rail: "from-cyan-400 to-cyan-600",
        glow: "shadow-[0_0_18px_rgba(34,211,238,0.40)]",
        pulse: "animate-pulse",
        icon: <Gift className="h-3.5 w-3.5" />,
      };
    }

    if (
      r.status === "expired" ||
      new Date(r.expires_at).getTime() <= Date.now()
    ) {
      return {
        key: "expired" as const,
        label: "EXPIRADO",
        shortLabel: "VENCIDO",
        color: "text-rose-400",
        border: "border-rose-500/18",
        rail: "from-rose-400 to-red-600",
        glow: "shadow-[0_0_18px_rgba(244,63,94,0.40)]",
        pulse: "",
        icon: <AlertCircle className="h-3.5 w-3.5" />,
      };
    }

    return {
      key: "pending" as const,
      label: "PENDIENTE",
      shortLabel: "PEND.",
      color: "text-amber-400",
      border: "border-amber-500/18",
      rail: "from-amber-300 to-yellow-500",
      glow: "shadow-[0_0_18px_rgba(250,204,21,0.38)]",
      pulse: "animate-pulse",
      icon: <Clock3 className="h-3.5 w-3.5" />,
    };
  }

  const popupCountdown = useMemo(() => {
    if (!selectedQR?.expires_at) return null;
    const expires = new Date(selectedQR.expires_at).getTime();
    return formatCountdown(expires - now);
  }, [selectedQR, now]);

  const selectedEntryState = selectedEntryQR ? getEntryState(selectedEntryQR) : null;

  const feedItems = useMemo<FeedItem[]>(() => {
    const movementItems: FeedItem[] = movements.map((mov) => {
      const positive = mov.amount > 0;

      return {
        id: `mov-${mov.id}`,
        kind: "movement",
        created_at: mov.created_at,
        title:
          mov.description?.trim() ||
          (positive ? "Créditos acreditados" : "Créditos usados"),
        subtitle: formatDate(mov.created_at),
        amount: mov.amount,
        positive,
      };
    });

    const redemptionItems: FeedItem[] = redemptions.flatMap((r) => {
      const rewardName = getRewardLabel(r);
      const items: FeedItem[] = [];

      items.push({
        id: `red-created-${r.id}`,
        kind: "redemption_created",
        created_at: r.created_at,
        title: `🎟️ QR generado: ${rewardName}`,
        subtitle: `Código ${r.short_token} · listo para usar`,
        amount: 0,
        positive: true,
      });

      if (isRedemptionUsed(r.status) && r.redeemed_at) {
        items.push({
          id: `red-used-${r.id}`,
          kind: "redemption_redeemed",
          created_at: r.redeemed_at,
          title: `🍾 Consumido en barra: ${rewardName}`,
          subtitle: formatDate(r.redeemed_at),
          amount: 0,
          positive: true,
        });
      } else if (
        r.expires_at &&
        (r.status === "expired" || new Date(r.expires_at).getTime() <= now)
      ) {
        items.push({
          id: `red-expired-${r.id}`,
          kind: "redemption_expired",
          created_at: r.expires_at,
          title: `⏰ QR vencido: ${rewardName}`,
          subtitle: formatDate(r.expires_at),
          amount: 0,
          positive: false,
        });
      }

      return items;
    });

    return [...movementItems, ...redemptionItems]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 40);
  }, [movements, redemptions, rewardNames, now]);

const visibleRedemptions = useMemo(() => {
  return redemptions
    .filter((r) => {
      const isUsed = r.status === "redeemed" || r.status === "used";
      const isExpiredByStatus = r.status === "expired";
      const isExpiredByTime =
        !!r.expires_at && new Date(r.expires_at).getTime() <= now;

      if (isUsed) return true;
      if (isExpiredByStatus || isExpiredByTime) return false;

      return true;
    })
.sort(
  (a, b) =>
    new Date(b.created_at).getTime() -
    new Date(a.created_at).getTime()
);
    });
}, [redemptions, now]);

  return (
    <DashboardShell title="MIS QR">
      <div className="mx-auto max-w-4xl space-y-4 px-4 pb-24 -mt-2">
        {isGuest && (
          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-500/10">
              <Lock className="h-6 w-6 text-amber-300" />
            </div>

            <h2 className="mt-4 text-xl font-black text-white">
              Estás como invitado
            </h2>

            <p className="mt-2 text-sm text-amber-200/85">
              Iniciá sesión para ver tus QR, tus canjes y tu historial.
            </p>
          </div>
        )}

        {!isGuest && (
          <div className="rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.10),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-4 backdrop-blur-xl sm:p-5">
            <div className="mb-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-200">
                <QrCodeIcon className="h-3.5 w-3.5" />
                Holy Wallet
              </div>

              <h1 className="mt-3 text-2xl font-black text-white sm:text-3xl">
                Mis QR
              </h1>

              <p className="mt-2 text-sm text-white/60">
                Entradas, VIP, canjes y movimientos de tu cuenta.
              </p>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2">
              <button
                onClick={() => setActiveTab("entradas")}
                className={`inline-flex items-center justify-center gap-1.5 rounded-2xl px-2 py-2.5 text-[11px] font-black transition sm:text-sm ${
                  activeTab === "entradas"
                    ? "border border-fuchsia-400/25 bg-fuchsia-500/15 text-fuchsia-100 shadow-[0_0_24px_rgba(217,70,239,0.16)]"
                    : "border border-white/10 bg-white/5 text-white/55 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Ticket className="h-4 w-4" />
                ENTRADAS
              </button>

              <button
                onClick={() => setActiveTab("canjes")}
                className={`inline-flex items-center justify-center gap-1.5 rounded-2xl px-2 py-2.5 text-[11px] font-black transition sm:text-sm ${
                  activeTab === "canjes"
                    ? "border border-fuchsia-400/25 bg-fuchsia-500/15 text-fuchsia-100 shadow-[0_0_24px_rgba(217,70,239,0.16)]"
                    : "border border-white/10 bg-white/5 text-white/55 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Wine className="h-4 w-4" />
                CANJES
              </button>

              <button
                onClick={() => setActiveTab("movimientos")}
                className={`inline-flex items-center justify-center gap-1.5 rounded-2xl px-2 py-2.5 text-[11px] font-black transition sm:text-sm ${
                  activeTab === "movimientos"
                    ? "border border-fuchsia-400/25 bg-fuchsia-500/15 text-fuchsia-100 shadow-[0_0_24px_rgba(217,70,239,0.16)]"
                    : "border border-white/10 bg-white/5 text-white/55 hover:bg-white/10 hover:text-white"
                }`}
              >
                <History className="h-4 w-4" />
                MOV.
              </button>
            </div>

            {activeTab === "entradas" ? (
              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-[24px] border border-amber-400/25 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(217,70,239,0.12),transparent_36%),linear-gradient(180deg,rgba(22,14,5,0.96),rgba(5,5,8,0.98))] p-3 shadow-[0_0_28px_rgba(251,191,36,0.06)]">
                  <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-amber-400/12 blur-3xl" />

                  <button
                    type="button"
                    onClick={toggleVipOpen}
                    className="relative z-10 flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border border-amber-400/25 bg-amber-500/10">
                        <Crown className="h-5 w-5 text-amber-200" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="truncate text-lg font-black leading-none text-amber-200">
                            CLIENTE VIP
                          </h2>

                          <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-amber-200">
                            Bloqueado
                          </span>
                        </div>

                        <p className="mt-1 truncate text-xs font-semibold text-white/65">
                          Sin fila • Sin pagar entrada
                        </p>
                      </div>
                    </div>

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border border-white/10 bg-white/5 text-white/65">
                      {vipOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </button>

                  {vipOpen && (
                    <div className="relative z-10 mt-3 rounded-[20px] border border-white/10 bg-black/25 p-3">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-amber-300">
                        <Lock className="h-3.5 w-3.5" />
                        ¿Cómo lo consigo?
                      </div>

                      <p className="mt-2 text-xs leading-relaxed text-white/60">
                        Más adelante se desbloquea por logros, ingresos y
                        actividad real en HOLY. Cuando seas VIP, acá vas a ver
                        tu QR dorado sin vencimiento.
                      </p>

                      <div className="mt-3 grid gap-2">
                        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                          <ShieldCheck className="h-4 w-4 text-emerald-300" />
                          <span className="text-xs font-semibold text-white/75">
                            Vení seguido a HOLY
                          </span>
                        </div>

                        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                          <Sparkles className="h-4 w-4 text-fuchsia-300" />
                          <span className="text-xs font-semibold text-white/75">
                            Sumá ingresos y participación
                          </span>
                        </div>

                        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                          <Trophy className="h-4 w-4 text-amber-300" />
                          <span className="text-xs font-semibold text-white/75">
                            Próximamente: logros y rangos
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {loading && entryQRs.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 p-5 text-center text-sm text-white/50">
                      Cargando entradas QR...
                    </div>
                  ) : entryQRs.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 p-5 text-center">
                      <Ticket className="mx-auto h-8 w-8 text-white/30" />
                      <h3 className="mt-3 text-sm font-black text-white">
                        MIS ENTRADAS QR
                      </h3>
                      <p className="mt-2 text-xs text-white/45">
                        Cuando te anotes en una lista free, tu QR de entrada va
                        a aparecer acá.
                      </p>
                    </div>
                  ) : (
                    entryQRs.map((entry) => {
                      const state = getEntryState(entry);
                      const isActiveEntry = state.key === "pending";
                      const eventName = entry.events?.name ?? "EVENTO HOLY";
                      const rrppName =
                        entry.rrpp_profiles?.display_name ?? "RRPP HOLY";

                      return (
                        <div
                          key={entry.id}
                          className={`relative overflow-hidden rounded-[26px] border bg-[linear-gradient(180deg,rgba(3,3,7,0.88),rgba(8,8,12,0.96))] p-4 ${state.border}`}
                        >
                          <div className="pointer-events-none absolute inset-y-4 right-4 flex w-[58px] flex-col items-center">
                            <div
                              className={`text-center text-[13px] font-black uppercase tracking-[0.16em] ${state.color} ${
                                isActiveEntry
                                  ? "animate-[pulse_2s_ease-in-out_infinite]"
                                  : ""
                              }`}
                            >
                              {state.shortLabel}
                            </div>

                            <div
                              className={`mt-2 w-[4px] flex-1 rounded-full bg-gradient-to-b ${state.rail} ${state.glow} ${
                                isActiveEntry
                                  ? "animate-[pulse_2s_ease-in-out_infinite]"
                                  : ""
                              }`}
                            />
                          </div>

                          <div className="pr-16">
                            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-amber-400/15 bg-amber-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-amber-200">
                              <Ticket className="h-3 w-3" />
                              Lista Free
                            </div>

                            <h3 className="text-[18px] font-black uppercase leading-tight text-white">
                              {eventName}
                            </h3>

                            <p className="mt-1 text-xs text-white/45">
                              Lista de {rrppName}
                            </p>

                            <div
                              className={`mt-3 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.04em] ${state.color}`}
                            >
                              {state.icon}
                              {state.label}
                            </div>

                            <p className={`mt-2 text-xs font-semibold ${state.color}`}>
                              {state.description}
                            </p>

                            <p className="mt-3 text-[11px] text-white/45">
                              Generado: {formatDate(entry.created_at)}
                            </p>

                            {entry.events?.event_date && (
                              <p className="mt-1 text-[11px] text-white/45">
                                Evento: {formatDate(entry.events.event_date)}
                              </p>
                            )}

                            {isActiveEntry && (
                              <button
                                type="button"
                                onClick={() => setSelectedEntryQR(entry)}
                                className="relative mt-4 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#facc15,#f59e0b)] px-4 py-2.5 text-xs font-black text-black shadow-[0_0_26px_rgba(250,204,21,0.28)] transition active:scale-[0.98]"
                              >
                                <span className="absolute inset-0 bg-gradient-to-r from-yellow-300/20 via-white/25 to-yellow-300/20 animate-[pulse_2.4s_ease-in-out_infinite]" />
                                <span className="relative z-10">VER QR</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : activeTab === "canjes" ? (
              <div className="space-y-3">
                {loading && visibleRedemptions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-white/50">
                    Cargando QR...
                  </div>
                ) : visibleRedemptions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-white/50">
                    Todavía no tenés canjes QR generados.
                  </div>
                ) : (
                  visibleRedemptions.map((r) => {
                    const state = getState(r);
                    const canOpenQR = isQrOpen(state.key);

                    const countdown =
                      canOpenQR && r.expires_at
                        ? formatCountdown(new Date(r.expires_at).getTime() - now)
                        : null;

                    return (
                      <div
                        key={r.id}
                        className={`group relative overflow-hidden rounded-[26px] border bg-[linear-gradient(180deg,rgba(3,3,7,0.86),rgba(8,8,12,0.94))] p-4 sm:p-5 ${state.border}`}
                      >
                        <div className="pointer-events-none absolute inset-y-4 right-4 flex w-[58px] flex-col items-center">
                          <div
                            className={`text-center text-[13px] font-black uppercase tracking-[0.16em] ${state.color} sm:text-[15px]`}
                          >
                            {state.shortLabel}
                          </div>

                          <div
                            className={`mt-2 w-[4px] flex-1 rounded-full bg-gradient-to-b ${state.rail} ${state.glow} ${state.pulse}`}
                          />
                        </div>

                        <div className="pr-16 sm:pr-[72px]">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/50">
                                <Wine className="h-3 w-3" />
                                Canje QR
                              </div>

                              <div className="text-[18px] font-black uppercase leading-tight text-white sm:text-[20px]">
                                {getRewardLabel(r)}
                              </div>

                              <div
                                className={`mt-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.04em] ${state.color}`}
                              >
                                {state.icon}
                                {state.label}
                              </div>

                              <div className="mt-3 text-[13px] font-black tracking-[0.32em] text-fuchsia-400 sm:text-[15px]">
                                {r.short_token}
                              </div>

                              <div className="mt-3 text-[11px] text-white/45 sm:text-xs">
                                Generado: {formatDate(r.created_at)}
                              </div>

                              {!r.expires_at ? (
                                <div className="mt-1 text-[11px] font-semibold text-cyan-400 sm:text-xs">
                                  Sin vencimiento
                                </div>
                              ) : canOpenQR ? (
                                <div className="mt-1 text-[11px] font-semibold text-amber-400 sm:text-xs">
                                  Vence en: {countdown}
                                </div>
                              ) : null}

                              {r.redeemed_at && (
                                <div className="mt-1 text-[11px] font-semibold text-emerald-400 sm:text-xs">
                                  Canjeado: {formatDate(r.redeemed_at)}
                                </div>
                              )}
                            </div>

                            <div className="shrink-0">
                          <button
  type="button"
  onClick={() => {
    if (canOpenQR) {
      setSelectedQR(r);
    }
  }}
                                className={`rounded-2xl px-4 py-2.5 text-xs font-black transition ${
                                  canOpenQR
                                    ? "bg-[linear-gradient(135deg,#d946ef,#a21caf)] text-white shadow-[0_0_26px_rgba(217,70,239,0.22)] hover:scale-[1.02] active:scale-[0.98]"
                                    : "bg-white/10 text-white/40"
                                }`}
                              >
                                {canOpenQR ? "VER QR" : "CANJEADO"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {loading && feedItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-white/50">
                    Cargando movimientos...
                  </div>
                ) : feedItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-white/50">
                    Todavía no hay actividad para mostrar.
                  </div>
                ) : (
                  feedItems.map((item) => {
                    const isPointsMovement = item.kind === "movement";

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-black/30 p-4 sm:p-5"
                      >
                        <div className="min-w-0 flex items-start gap-3">
                          <div className="mt-0.5">
                            {item.kind === "movement" ? (
                              item.positive ? (
                                <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                              ) : (
                                <ArrowDownLeft className="h-4 w-4 text-red-400" />
                              )
                            ) : item.kind === "redemption_redeemed" ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            ) : item.kind === "redemption_expired" ? (
                              <AlertCircle className="h-4 w-4 text-red-400" />
                            ) : (
                              <Gift className="h-4 w-4 text-fuchsia-400" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="break-words text-sm font-semibold text-white">
                              {item.title}
                            </div>
                            <div className="mt-1 text-[11px] text-white/45">
                              {item.subtitle}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          {isPointsMovement ? (
                            <div
                              className={`text-sm font-black ${
                                item.positive ? "text-emerald-400" : "text-red-400"
                              }`}
                            >
                              {item.positive ? "+" : ""}
                              {item.amount}
                            </div>
                          ) : (
                            <div className="text-[11px] font-bold text-white/40">
                              QR
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {!isGuest && selectedEntryQR && selectedEntryState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[30px] border border-amber-500/20 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.16),transparent_30%),linear-gradient(180deg,#09090f,#050507)] p-6 text-center shadow-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">
              <Ticket className="h-3.5 w-3.5" />
              Lista Free
            </div>

            <h2 className="mt-3 text-xl font-black text-white">
              {selectedEntryQR.events?.name ?? "EVENTO HOLY"}
            </h2>

            <div
              className={`mt-2 flex items-center justify-center gap-1.5 text-sm font-black uppercase ${selectedEntryState.color}`}
            >
              {selectedEntryState.icon}
              {selectedEntryState.label}
            </div>

            <div className="mt-5 inline-flex rounded-[24px] bg-white p-4">
              <QRCode value={selectedEntryQR.qr_token} size={220} />
            </div>

            <div className={`mt-4 text-sm font-semibold ${selectedEntryState.color}`}>
              {selectedEntryState.description}
            </div>

            <div className="mt-2 text-xs text-white/45">
              Mostralo en puerta para ingresar
            </div>

            <button
              onClick={() => setSelectedEntryQR(null)}
              className="mt-5 w-full rounded-2xl bg-amber-500 px-4 py-3 text-sm font-black text-black transition hover:bg-amber-400"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {!isGuest && selectedQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[30px] border border-fuchsia-500/20 bg-[radial-gradient(circle_at_top,rgba(217,70,239,0.14),transparent_30%),linear-gradient(180deg,#09090f,#050507)] p-6 text-center shadow-2xl">
            <h2 className="text-xl font-black text-white">
              {getRewardLabel(selectedQR)}
            </h2>

            <div className="mt-2 text-2xl font-black tracking-[0.28em] text-fuchsia-400">
              {selectedQR.short_token}
            </div>

            <div className="mt-5 inline-flex rounded-[24px] bg-white p-4">
              <QRCode value={selectedQR.qr_token} size={220} />
            </div>

            {!selectedQR.expires_at ? (
              <div className="mt-4 text-sm font-semibold text-cyan-400">
                SIN VENCIMIENTO
              </div>
            ) : (
              <div className="mt-4 text-sm font-semibold text-yellow-400">
                {popupCountdown}
              </div>
            )}

            <div className="mt-2 text-xs text-white/45">
              Mostralo en barra para validar el canje
            </div>

            <button
              onClick={() => setSelectedQR(null)}
              className="mt-5 w-full rounded-2xl bg-fuchsia-600 px-4 py-3 text-sm font-black text-white transition hover:bg-fuchsia-500"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}