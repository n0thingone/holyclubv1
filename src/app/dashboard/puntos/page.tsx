"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Gift,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Lock,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Beer,
  Martini,
  Pizza,
  UtensilsCrossed,
  Crown,
} from "lucide-react";
import QRCode from "react-qr-code";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

type Reward = {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
};

type EventRow = {
  id: string;
  name: string;
};

type Popup = {
  rewardName: string;
  qrToken: string;
  shortToken: string;
  expiresAt: string;
};

type RpcRedeemResponse = {
  ok: boolean;
  message?: string;
  qr_token?: string;
  short_token?: string;
  expires_at?: string | null;
  available_points?: number | null;
  new_balance?: number | null;
};

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60000);
}

function formatCountdown(ms: number) {
  if (ms <= 0) return "00:00";

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

function getIsGuest() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("holy_guest") === "true";
}

function getRewardTier(points: number) {
  if (points < 2000) return "common";
  if (points < 5000) return "rare";
  if (points < 9000) return "epic";
  return "legendary";
}

function getTierLabel(points: number) {
  const tier = getRewardTier(points);

  switch (tier) {
    case "common":
      return "COMÚN";
    case "rare":
      return "RARO";
    case "epic":
      return "ÉPICO";
    case "legendary":
      return "LEGEND";
    default:
      return "REWARD";
  }
}

function getRewardIcon(name: string) {
  const n = name.toLowerCase();

  if (n.includes("fernet")) return Martini;
  if (n.includes("cerveza") || n.includes("pinta")) return Beer;
  if (n.includes("trago")) return Martini;
  if (n.includes("pizza")) return Pizza;
  if (n.includes("burger") || n.includes("hamb")) return UtensilsCrossed;
  if (n.includes("vip")) return Crown;

  return Gift;
}

function getTierStyles(points: number, active: boolean) {
  const tier = getRewardTier(points);

  const activeBoost = active
    ? "scale-[1.005] opacity-100"
    : "scale-[0.985] opacity-90";

  switch (tier) {
    case "common":
      return {
        label: "COMÚN",
        card: `${activeBoost} border-white/15 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.10),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] shadow-[0_18px_55px_rgba(0,0,0,0.34)]`,
        glow: "bg-white/10",
        badge:
          "border-white/15 bg-white/10 text-white/85 shadow-[0_0_18px_rgba(255,255,255,0.08)]",
        accent: "text-white",
        ring: "border-white/16",
        dot: "bg-white",
        borderGlow: "shadow-[0_0_18px_rgba(255,255,255,0.08)]",
        priceGlow: "drop-shadow-[0_0_14px_rgba(255,255,255,0.22)]",
        button:
          "from-fuchsia-500 via-purple-600 to-fuchsia-600 shadow-[0_0_34px_rgba(217,70,239,0.55)]",
      };

    case "rare":
      return {
        label: "RARO",
        card: `${activeBoost} border-cyan-400/40 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.20),transparent_30%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.09),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.07),rgba(34,211,238,0.035))] shadow-[0_18px_55px_rgba(0,0,0,0.34),0_0_42px_rgba(34,211,238,0.20)]`,
        glow: "bg-cyan-400/16",
        badge:
          "border-cyan-400/30 bg-cyan-500/12 text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.22)]",
        accent: "text-cyan-300",
        ring: "border-cyan-400/24",
        dot: "bg-cyan-300",
        borderGlow: "shadow-[0_0_26px_rgba(34,211,238,0.22)]",
        priceGlow: "drop-shadow-[0_0_18px_rgba(34,211,238,0.36)]",
        button:
          "from-cyan-400 via-fuchsia-500 to-purple-600 shadow-[0_0_34px_rgba(34,211,238,0.32),0_0_34px_rgba(217,70,239,0.40)]",
      };

    case "epic":
      return {
        label: "ÉPICO",
        card: `${activeBoost} border-fuchsia-400/45 bg-[radial-gradient(circle_at_top,rgba(217,70,239,0.24),transparent_30%),radial-gradient(circle_at_bottom,rgba(168,85,247,0.13),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(217,70,239,0.05))] shadow-[0_18px_55px_rgba(0,0,0,0.34),0_0_48px_rgba(217,70,239,0.28)]`,
        glow: "bg-fuchsia-400/18",
        badge:
          "border-fuchsia-400/32 bg-fuchsia-500/14 text-fuchsia-300 shadow-[0_0_26px_rgba(217,70,239,0.30)]",
        accent: "text-fuchsia-300",
        ring: "border-fuchsia-400/26",
        dot: "bg-fuchsia-300",
        borderGlow: "shadow-[0_0_34px_rgba(217,70,239,0.30)]",
        priceGlow: "drop-shadow-[0_0_22px_rgba(217,70,239,0.48)]",
        button:
          "from-fuchsia-400 via-purple-600 to-fuchsia-600 shadow-[0_0_38px_rgba(217,70,239,0.66)]",
      };

    case "legendary":
      return {
        label: "LEGEND",
        card: `${activeBoost} border-amber-400/55 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.26),transparent_30%),radial-gradient(circle_at_bottom,rgba(245,158,11,0.16),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(251,191,36,0.055))] shadow-[0_18px_55px_rgba(0,0,0,0.34),0_0_54px_rgba(251,191,36,0.30)]`,
        glow: "bg-amber-400/20",
        badge:
          "border-amber-400/36 bg-amber-500/14 text-amber-300 shadow-[0_0_28px_rgba(251,191,36,0.34)]",
        accent: "text-amber-300",
        ring: "border-amber-400/30",
        dot: "bg-amber-300",
        borderGlow: "shadow-[0_0_40px_rgba(251,191,36,0.34)]",
        priceGlow: "drop-shadow-[0_0_24px_rgba(251,191,36,0.52)]",
        button:
          "from-amber-300 via-fuchsia-500 to-purple-700 shadow-[0_0_38px_rgba(251,191,36,0.38),0_0_42px_rgba(217,70,239,0.48)]",
      };

    default:
      return {
        label: "REWARD",
        card: `${activeBoost} border-white/12 bg-white/5`,
        glow: "bg-white/10",
        badge: "border-white/12 bg-white/8 text-white/80",
        accent: "text-white",
        ring: "border-white/14",
        dot: "bg-white/90",
        borderGlow: "",
        priceGlow: "",
        button:
          "from-fuchsia-500 via-purple-600 to-fuchsia-600 shadow-[0_0_34px_rgba(217,70,239,0.55)]",
      };
  }
}

export default function Page() {
  const supabase = getSupabaseClient();
  const { profile, refreshProfile, setLiveHolyPoints } = useAuth();

  const userId = (profile as any)?.id ?? null;

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [event, setEvent] = useState<EventRow | null>(null);

  const [popup, setPopup] = useState<Popup | null>(null);
  const [now, setNow] = useState(Date.now());

  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loadingRewardId, setLoadingRewardId] = useState<string | null>(null);

  const [isGuest, setIsGuest] = useState(false);
  const [localPoints, setLocalPoints] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const mountedRef = useRef(true);
  const sliderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setIsGuest(getIsGuest());
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isGuest) {
      setLocalPoints(0);
      return;
    }

    if (profile) {
      setLocalPoints(Number((profile as any)?.holy_points_balance ?? 0));
    }
  }, [isGuest, profile]);

  const loadInitialData = useCallback(async () => {
    try {
      const [
        { data: rewardsData, error: rewardsError },
        { data: eventData, error: eventError },
      ] = await Promise.all([
        supabase
          .from("holy_rewards")
          .select("id,name,description,points_cost")
          .eq("active", true)
           .gt("points_cost", 0)
          .order("points_cost", { ascending: true }),
        supabase
          .from("events")
          .select("id,name")
          .eq("status", "active")
          .maybeSingle(),
      ]);

      if (rewardsError) {
        console.error("Error cargando rewards:", rewardsError);
        setError("No se pudieron cargar los premios.");
      }

      if (eventError) {
        console.error("Error cargando evento activo:", eventError);
      }

      if (mountedRef.current) {
        setRewards((rewardsData ?? []) as Reward[]);
        setEvent((eventData ?? null) as EventRow | null);
        setActiveIndex(0);
      }
    } catch (err) {
      console.error("Error cargando datos:", err);
      setError("No se pudieron cargar los datos del canje.");
    }
  }, [supabase]);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (!popup) return;

    const expires = new Date(popup.expiresAt).getTime();
    if (expires <= now) {
      setPopup(null);
      setMsg("El QR venció.");
    }
  }, [popup, now]);

  const profilePoints = Number((profile as any)?.holy_points_balance ?? 0);

  const shownBalance =
    isGuest ? 0 : localPoints !== null ? localPoints : profilePoints;

  const loadingBalance = !isGuest && !profile;

  const countdown = useMemo(() => {
    if (!popup) return "00:00";
    return formatCountdown(new Date(popup.expiresAt).getTime() - now);
  }, [popup, now]);

  const activeReward = rewards[activeIndex] ?? null;

  function scrollToCard(index: number) {
    const container = sliderRef.current;
    if (!container) return;
    if (index < 0 || index > rewards.length - 1) return;

    const children = container.children;
    if (!children[index]) return;

    const el = children[index] as HTMLElement;

    container.scrollTo({
      left: el.offsetLeft - 16,
      behavior: "smooth",
    });

    setActiveIndex(index);
  }

  function goPrev() {
    scrollToCard(Math.max(activeIndex - 1, 0));
  }

  function goNext() {
    scrollToCard(Math.min(activeIndex + 1, rewards.length - 1));
  }

  function handleSliderScroll() {
    const container = sliderRef.current;
    if (!container) return;

    const children = Array.from(container.children) as HTMLElement[];
    if (children.length === 0) return;

    const containerCenter = container.scrollLeft + container.clientWidth / 2;

    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    children.forEach((child, index) => {
      const childCenter = child.offsetLeft + child.clientWidth / 2;
      const distance = Math.abs(containerCenter - childCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setActiveIndex((prev) => (prev !== closestIndex ? closestIndex : prev));
  }

  async function redeem(reward: Reward) {
    setError(null);
    setMsg(null);

    if (isGuest) {
      setError("Iniciá sesión para canjear premios y generar tu QR.");
      return;
    }

    if (!userId) {
      setError("No se encontró tu usuario. Volvé a iniciar sesión.");
      return;
    }

    if (!event?.id) {
      setError("No hay un evento activo en este momento.");
      return;
    }

    if (loadingRewardId) return;

    const currentPoints = Number(shownBalance ?? 0);

    if (currentPoints < reward.points_cost) {
      setError("No tenés créditos suficientes.");
      return;
    }

    setLoadingRewardId(reward.id);

    try {
      const { data, error } = await (supabase as any).rpc(
        "create_reward_redemption",
        {
          p_user_id: userId,
          p_reward_id: reward.id,
          p_event_id: event.id,
          p_points_cost: reward.points_cost,
        }
      );

      const result = data as RpcRedeemResponse | null;

      if (error) {
        console.error("RPC create_reward_redemption error:", error);
        setError(error.message || "Error al generar el QR.");
        return;
      }

      if (!result?.ok) {
        setError(result?.message || "No se pudo generar el QR.");
        await refreshProfile();
        return;
      }

      const nextBalance =
        typeof result.available_points === "number"
          ? result.available_points
          : typeof result.new_balance === "number"
          ? result.new_balance
          : currentPoints;

      const finalBalance = Number(nextBalance);

      setLocalPoints(finalBalance);
      setLiveHolyPoints(finalBalance);

      setPopup({
        rewardName: reward.name,
        qrToken: result.qr_token ?? "",
        shortToken: result.short_token ?? "",
        expiresAt:
          result.expires_at || addMinutes(new Date(), 10).toISOString(),
      });

      setMsg("QR generado correctamente.");
      await refreshProfile();
    } catch (err) {
      console.error("Error inesperado al canjear:", err);
      setError("Ocurrió un error inesperado al generar el QR.");
      await refreshProfile();
    } finally {
      setLoadingRewardId(null);
    }
  }

  return (
    <>
      <div className="mx-auto flex h-[calc(100dvh-92px)] w-full max-w-6xl flex-col overflow-hidden px-4 pb-1 pt-1 text-white">
        <section className="shrink-0 space-y-2">
          <div className="flex items-center justify-between gap-2 rounded-[22px] border border-fuchsia-500/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] px-3 py-2 shadow-[0_0_42px_rgba(168,85,247,0.12)] backdrop-blur-xl">
            <div className="inline-flex min-w-0 items-center gap-2 rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-3 py-1.5">
              <Gift className="h-4 w-4 shrink-0 text-fuchsia-300" />
              <span className="text-[12px] font-bold text-fuchsia-100/90">
                Créditos
              </span>
              <span className="truncate text-[15px] font-black text-white">
                {isGuest
                  ? 0
                  : loadingBalance
                  ? "..."
                  : shownBalance.toLocaleString("es-AR")}
              </span>
            </div>

            {event?.name ? (
              <div className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-black uppercase text-cyan-300">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{event.name}</span>
              </div>
            ) : (
              <div className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-[11px] font-black uppercase text-amber-300">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Sin evento</span>
              </div>
            )}
          </div>

          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-fuchsia-300/75">
                HOLY REWARDS
              </p>
              <h1 className="mt-0.5 text-[22px] font-black leading-none tracking-tight text-white">
                CANJEAR
              </h1>
              <p className="mt-0.5 text-[11px] text-white/50">
                Deslizá y elegí tu reward.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={goPrev}
                disabled={activeIndex === 0}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <button
                onClick={goNext}
                disabled={activeIndex === rewards.length - 1}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-white/5 pt-1">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
              {activeReward?.name ?? "Rewards disponibles"}
            </p>

            {rewards.length > 0 ? (
              <span className="shrink-0 text-[10px] font-bold text-white/35">
                {activeIndex + 1}/{rewards.length}
              </span>
            ) : null}
          </div>
        </section>

        {isGuest && (
          <div className="mt-2 flex shrink-0 items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Iniciá sesión para canjear premios y generar tus QR.</span>
          </div>
        )}

        {error && (
          <div className="mt-2 flex shrink-0 items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {msg && (
          <div className="mt-2 flex shrink-0 items-start gap-2 rounded-2xl border border-green-500/30 bg-green-500/10 p-3 text-xs text-green-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        <section className="min-h-0 flex-1 pt-2">
          {rewards.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-white/60">
              No hay premios disponibles.
            </div>
          ) : (
            <>
              <div
                ref={sliderRef}
                onScroll={handleSliderScroll}
                className="flex h-full snap-x snap-mandatory gap-4 overflow-x-auto pb-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                {rewards.map((r, index) => {
                  const localInsufficient = shownBalance < r.points_cost;
                  const isLoading = loadingRewardId === r.id;
                  const disabled =
                    isGuest ||
                    loadingBalance ||
                    isLoading ||
                    !event?.id ||
                    localInsufficient;

                  const isActive = index === activeIndex;
                  const tier = getTierStyles(r.points_cost, isActive);
                  const RewardIcon = getRewardIcon(r.name);

                  return (
                    <article
                      key={r.id}
                      className="h-full min-w-0 shrink-0 basis-[96%] snap-center sm:basis-[82%] lg:basis-[60%]"
                    >
                      <div className="relative flex h-full origin-top scale-[0.94] flex-col">
                        <div
                          className={`relative flex-1 overflow-hidden rounded-[30px] border p-3 transition duration-300 ${tier.card} ${
                            isActive ? tier.borderGlow : ""
                          }`}
                        >
                          <div className="pointer-events-none absolute inset-0 opacity-100">
                            <div
                              className={`absolute -left-12 top-0 h-32 w-32 rounded-full blur-3xl ${tier.glow}`}
                            />
                            <div
                              className={`delay-700 absolute bottom-0 right-0 h-32 w-32 rounded-full blur-3xl ${tier.glow}`}
                            />
                            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_28%,rgba(0,0,0,0.14))]" />
                          </div>

                          <div
                            className={`relative flex h-full flex-col overflow-hidden rounded-[26px] border ${tier.ring} bg-[linear-gradient(180deg,rgba(0,0,0,0.30),rgba(0,0,0,0.52))] px-5 pb-4 pt-4 [clip-path:polygon(12%_0%,88%_0%,100%_11%,100%_86%,50%_100%,0%_86%,0%_11%)]`}
                          >
                            <div className="absolute inset-[1px] rounded-[26px] [clip-path:polygon(12%_0%,88%_0%,100%_11%,100%_86%,50%_100%,0%_86%,0%_11%)] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.015))]" />

                            <div className="relative z-10 flex h-full min-h-0 flex-col">
                              <div className="flex justify-center">
                                <div className="flex flex-wrap items-center justify-center gap-2">
                                  <span
                                    className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${tier.badge}`}
                                  >
                                    {tier.label}
                                  </span>

                                  {isActive && (
                                    <span className="rounded-full border border-emerald-400/25 bg-emerald-500/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-300 shadow-[0_0_22px_rgba(16,185,129,0.22)]">
                                      SELECT
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="mt-3 flex justify-center">
                                <div className="relative flex h-[132px] w-[132px] items-center justify-center rounded-full border border-white/10 bg-black/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                                  <div
                                    className={`holy-icon-glow absolute inset-3 rounded-full blur-2xl ${tier.glow}`}
                                  />
                                  <div
                                    className={`relative flex h-[72px] w-[72px] items-center justify-center rounded-[22px] border border-white/10 bg-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.28)] ${tier.borderGlow}`}
                                  >
                                    <RewardIcon
                                      className={`h-9 w-9 ${tier.accent}`}
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 text-center">
                                <h3 className="text-[25px] font-black uppercase leading-[0.96] tracking-tight text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.12)]">
                                  {r.name}
                                </h3>

                                <p className="mx-auto mt-1.5 max-w-[92%] text-[12px] font-semibold leading-snug text-white/62">
                                  {r.description?.trim()
                                    ? r.description
                                    : "Canjeable en barra presentando tu QR."}
                                </p>
                              </div>

                              <div className="mt-3 border-t border-white/10 pt-3 text-center">
                                <div
                                  className={`text-[10px] font-black uppercase tracking-[0.22em] ${tier.accent}`}
                                >
                                  PRECIO
                                </div>

                                <div className="mt-1 flex flex-col items-center justify-center">
                                  <span
                                    className={`holy-price-pulse text-[46px] font-black leading-none text-white ${tier.priceGlow}`}
                                  >
                                    {r.points_cost.toLocaleString("es-AR")}
                                  </span>
                                  <span className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/40">
                                    créditos
                                  </span>
                                </div>
                              </div>

                              <div className="mt-auto pt-4">
                                <div className="mx-auto mb-2 hidden max-w-[92%] items-center justify-between gap-2 rounded-[16px] border border-white/10 bg-black/20 px-3 py-2 sm:flex">
                                  <div className="min-w-0">
                                    <p
                                      className={`truncate text-xs font-bold ${
                                        localInsufficient
                                          ? "text-white/35"
                                          : "text-white/65"
                                      }`}
                                    >
                                      {localInsufficient
                                        ? "No te alcanza el saldo"
                                        : "Canje instantáneo en barra"}
                                    </p>
                                  </div>

                                  <Trophy className={`h-4 w-4 ${tier.accent}`} />
                                </div>

                                <button
                                  onClick={() => redeem(r)}
                                  disabled={disabled}
                                  className={`inline-flex w-full items-center justify-center gap-3 rounded-[22px] px-5 py-3.5 text-base font-black uppercase tracking-[0.02em] transition ${
                                    disabled
                                      ? "cursor-not-allowed bg-white/10 text-white/35"
                                      : `bg-gradient-to-r ${tier.button} text-white hover:scale-[1.015] active:scale-[0.985]`
                                  }`}
                                >
                                  {isGuest
                                    ? "Iniciá sesión"
                                    : loadingBalance
                                    ? "Cargando..."
                                    : isLoading
                                    ? "Generando..."
                                    : localInsufficient
                                    ? "No alcanza"
                                    : "Canjear"}

                                  {!disabled && (
                                    <ArrowRight className="h-5 w-5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="mt-1 flex shrink-0 items-center justify-center gap-2">
                {rewards.map((reward, index) => {
                  const tier = getTierStyles(reward.points_cost, true);
                  const active = index === activeIndex;

                  return (
                    <button
                      key={reward.id}
                      onClick={() => scrollToCard(index)}
                      className={`h-2 rounded-full transition-all ${
                        active ? `w-7 ${tier.dot}` : "w-2 bg-white/20"
                      }`}
                      aria-label={`Ir al reward ${index + 1}`}
                    />
                  );
                })}
              </div>
            </>
          )}
        </section>

        {popup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
            <div className="relative w-full max-w-md overflow-hidden rounded-[34px] border border-fuchsia-500/20 bg-[radial-gradient(circle_at_top,rgba(217,70,239,0.18),transparent_28%),linear-gradient(180deg,rgba(18,18,24,0.98),rgba(6,6,10,0.98))] p-6 text-center shadow-[0_0_80px_rgba(217,70,239,0.22)]">
              <div className="absolute inset-0 opacity-60">
                <div className="absolute left-10 top-10 h-24 w-24 rounded-full bg-fuchsia-500/20 blur-3xl" />
                <div className="absolute right-10 bottom-10 h-24 w-24 rounded-full bg-cyan-500/15 blur-3xl" />
              </div>

              <div className="relative">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] border border-fuchsia-400/20 bg-fuchsia-500/10">
                  <Gift className="h-10 w-10 text-fuchsia-300" />
                </div>

                <p className="mt-5 text-[11px] font-black uppercase tracking-[0.32em] text-fuchsia-300">
                  QR GENERADO
                </p>

                <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {popup.rewardName}
                </h2>

                <p className="mt-2 text-sm text-white/60">
                  Mostralo en barra para validar tu canje.
                </p>

                <div className="mt-6 flex justify-center rounded-[28px] bg-white p-5 shadow-[0_10px_40px_rgba(255,255,255,0.08)]">
                  <QRCode value={popup.qrToken} size={220} />
                </div>

                <div className="mt-5">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/35">
                    Código corto
                  </div>
                  <div className="mt-2 text-3xl font-black tracking-[0.32em] text-fuchsia-300">
                    {popup.shortToken}
                  </div>
                </div>

                <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-amber-300">
                  <Clock3 className="h-4 w-4" />
                  <span className="font-bold">{countdown}</span>
                </div>

                <div className="mt-3 text-xs text-white/45">
                  Este QR vence automáticamente.
                </div>

                <button
                  onClick={() => setPopup(null)}
                  className="mt-6 w-full rounded-2xl bg-fuchsia-600 px-4 py-3 font-black text-white transition hover:bg-fuchsia-500"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes holyPulseGlow {
          0%,
          100% {
            opacity: 0.55;
            transform: scale(0.98);
          }
          50% {
            opacity: 0.95;
            transform: scale(1.05);
          }
        }

        @keyframes holyPulsePrice {
          0%,
          100% {
            opacity: 0.94;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.018);
          }
        }

        .holy-icon-glow {
          animation: holyPulseGlow 2.6s ease-in-out infinite;
        }

        .holy-price-pulse {
          animation: holyPulsePrice 2.2s ease-in-out infinite;
        }

        .delay-700 {
          animation-delay: 0.7s;
        }
      `}</style>
    </>
  );
}