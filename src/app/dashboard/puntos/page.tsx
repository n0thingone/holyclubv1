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
  Zap,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Beer,
  Martini,
  Pizza,
  Hamburger,
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
  if (n.includes("burger") || n.includes("hamb")) return Hamburger;
  if (n.includes("vip")) return Crown;

  return Gift;
}

function getTierStyles(points: number, active: boolean) {
  const tier = getRewardTier(points);

  const activeBoost = active
    ? "scale-[1.01] opacity-100"
    : "scale-[0.985] opacity-90";

  switch (tier) {
    case "common":
      return {
        card: `${activeBoost} border-white/12 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] shadow-[0_18px_55px_rgba(0,0,0,0.30)]`,
        glow: "bg-white/10",
        badge:
          "border-white/12 bg-white/8 text-white/80 shadow-[0_0_18px_rgba(255,255,255,0.08)]",
        accent: "text-white",
        ring: "border-white/14",
        dot: "bg-white/90",
        pulseShadow:
          "shadow-[0_0_18px_rgba(255,255,255,0.10),0_0_36px_rgba(255,255,255,0.05)]",
        priceGlow: "drop-shadow-[0_0_14px_rgba(255,255,255,0.18)]",
      };

    case "rare":
      return {
        card: `${activeBoost} border-cyan-400/35 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.10),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(34,211,238,0.04))] shadow-[0_18px_55px_rgba(0,0,0,0.30),0_0_36px_rgba(34,211,238,0.18)]`,
        glow: "bg-cyan-400/12",
        badge:
          "border-cyan-400/24 bg-cyan-500/10 text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.18)]",
        accent: "text-cyan-300",
        ring: "border-cyan-400/18",
        dot: "bg-cyan-300",
        pulseShadow:
          "shadow-[0_0_24px_rgba(34,211,238,0.20),0_0_54px_rgba(34,211,238,0.10)]",
        priceGlow: "drop-shadow-[0_0_18px_rgba(34,211,238,0.30)]",
      };

    case "epic":
      return {
        card: `${activeBoost} border-fuchsia-400/38 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.20),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.14),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(217,70,239,0.05))] shadow-[0_18px_55px_rgba(0,0,0,0.30),0_0_42px_rgba(217,70,239,0.20)]`,
        glow: "bg-fuchsia-400/14",
        badge:
          "border-fuchsia-400/26 bg-fuchsia-500/10 text-fuchsia-300 shadow-[0_0_24px_rgba(217,70,239,0.22)]",
        accent: "text-fuchsia-300",
        ring: "border-fuchsia-400/18",
        dot: "bg-fuchsia-300",
        pulseShadow:
          "shadow-[0_0_28px_rgba(217,70,239,0.24),0_0_70px_rgba(217,70,239,0.12)]",
        priceGlow: "drop-shadow-[0_0_20px_rgba(217,70,239,0.34)]",
      };

    case "legendary":
      return {
        card: `${activeBoost} border-amber-400/45 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.20),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.16),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(251,191,36,0.05))] shadow-[0_18px_55px_rgba(0,0,0,0.30),0_0_48px_rgba(251,191,36,0.22)]`,
        glow: "bg-amber-400/14",
        badge:
          "border-amber-400/30 bg-amber-500/10 text-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.20)]",
        accent: "text-amber-300",
        ring: "border-amber-400/20",
        dot: "bg-amber-300",
        pulseShadow:
          "shadow-[0_0_30px_rgba(251,191,36,0.24),0_0_80px_rgba(251,191,36,0.14)]",
        priceGlow: "drop-shadow-[0_0_22px_rgba(251,191,36,0.38)]",
      };

    default:
      return {
        card: `${activeBoost} border-white/12 bg-white/5`,
        glow: "bg-white/10",
        badge: "border-white/12 bg-white/8 text-white/80",
        accent: "text-white",
        ring: "border-white/14",
        dot: "bg-white/90",
        pulseShadow: "",
        priceGlow: "",
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
    if (rewards.length === 0) return;
    scrollToCard(Math.max(activeIndex - 1, 0));
  }

  function goNext() {
    if (rewards.length === 0) return;
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
      const { data, error } = await supabase.rpc("create_reward_redemption", {
        p_user_id: userId,
        p_reward_id: reward.id,
        p_event_id: event.id,
        p_points_cost: reward.points_cost,
      });

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
     <div className="mx-auto w-full max-w-6xl space-y-2 px-4 pb-24 pt-3 text-white">
        <section className="relative overflow-hidden rounded-[24px] border border-fuchsia-500/20 bg-[radial-gradient(circle_at_top,rgba(217,70,239,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.08),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-3 shadow-[0_0_60px_rgba(168,85,247,0.14)] backdrop-blur-xl">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.16))]" />
          <div className="absolute -left-10 top-4 h-24 w-24 rounded-full bg-fuchsia-500/12 blur-3xl" />
          <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1.5 shadow-[0_0_24px_rgba(217,70,239,0.14)]">
                <Gift className="h-4 w-4 text-fuchsia-300" />
                <span className="text-sm font-semibold text-fuchsia-100/90">
                  Créditos
                </span>
                <span className="text-base font-black text-white">
                  {isGuest
                    ? 0
                    : loadingBalance
                    ? "..."
                    : shownBalance.toLocaleString("es-AR")}
                </span>
              </div>

              {event?.name ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-sm font-semibold text-cyan-300">
                  <Sparkles className="h-4 w-4" />
                  Evento activo: {event.name}
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-sm font-semibold text-amber-300">
                  <AlertCircle className="h-4 w-4" />
                  Sin evento activo
                </div>
              )}
            </div>

            <div className="mt-2.5">
              <p className="text-[9px] font-black uppercase tracking-[0.26em] text-fuchsia-300/80">
                HOLY REWARDS
              </p>

              <h1 className="mt-1 text-[25px] font-black leading-none tracking-tight text-white sm:text-[30px]">
                CANJEAR
              </h1>

              <p className="mt-1 text-[13px] text-white/60">
                Deslizá la carta y elegí tu reward.
              </p>
            </div>
          </div>
        </section>

        {isGuest && (
          <div className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-300">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Estás como invitado. Iniciá sesión para canjear premios y generar
              tus QR.
            </span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {msg && (
          <div className="flex items-start gap-2 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-green-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        <section className="space-y-2">
          {rewards.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-white/60">
              No hay premios disponibles.
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/35">
                    Rewards disponibles
                  </p>
                  <h2 className="mt-1 text-[18px] font-black text-white sm:text-[22px]">
                    {activeReward?.name ?? "Canjes HOLY"}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={goPrev}
                    disabled={activeIndex === 0}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <button
                    onClick={goNext}
                    disabled={activeIndex === rewards.length - 1}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div
                ref={sliderRef}
                onScroll={handleSliderScroll}
                className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
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
                  const tierLabel = getTierLabel(r.points_cost);
                  const RewardIcon = getRewardIcon(r.name);

                  return (
                    <article
                      key={r.id}
                      className="min-w-0 shrink-0 basis-[95%] snap-center sm:basis-[82%] lg:basis-[60%]"
                    >
                      <div className="relative flex min-h-[68vh] flex-col">
                        <div
                          className={`holy-card-pulse relative flex-1 overflow-hidden rounded-[34px] border p-4 transition duration-300 sm:p-5 ${tier.card} ${
                            isActive ? tier.pulseShadow : ""
                          }`}
                        >
                          <div className="pointer-events-none absolute inset-0 opacity-100">
                            <div
                              className={`holy-card-orb absolute -left-10 top-0 h-32 w-32 rounded-full blur-3xl ${tier.glow}`}
                            />
                            <div
                              className={`holy-card-orb delay-700 absolute bottom-0 right-0 h-32 w-32 rounded-full blur-3xl ${tier.glow}`}
                            />
                            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_28%,rgba(0,0,0,0.12))]" />
                          </div>

                          <div
                            className={`relative flex h-full flex-col overflow-hidden rounded-[28px] border ${tier.ring} bg-[linear-gradient(180deg,rgba(0,0,0,0.28),rgba(0,0,0,0.40))] px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6 [clip-path:polygon(12%_0%,88%_0%,100%_11%,100%_86%,50%_100%,0%_86%,0%_11%)]`}
                          >
                            <div className="absolute inset-[1px] rounded-[26px] [clip-path:polygon(12%_0%,88%_0%,100%_11%,100%_86%,50%_100%,0%_86%,0%_11%)] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))]" />

                            <div className="relative z-10 flex h-full flex-col">
                              <div className="flex justify-center">
                                <div className="flex flex-wrap items-center justify-center gap-2">
                                  <span
                                    className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] ${tier.badge}`}
                                  >
                                    {tierLabel}
                                  </span>

                                  {isActive && (
                                    <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                                      Seleccionado
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="mt-6 flex items-center justify-center">
                                <div className="relative flex h-[210px] w-[210px] items-center justify-center rounded-full border border-white/10 bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:h-[230px] sm:w-[230px]">
                                  <div
                                    className={`holy-icon-glow absolute inset-4 rounded-full blur-2xl ${tier.glow}`}
                                  />
                                  <div className="relative flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/10 bg-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.25)] sm:h-28 sm:w-28">
                                    <RewardIcon
                                      className={`h-12 w-12 ${tier.accent}`}
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="mt-5 text-center">
                                <h3 className="text-[30px] font-black uppercase leading-[0.95] tracking-tight text-white sm:text-[38px]">
                                  {r.name}
                                </h3>

                                <p className="mx-auto mt-3 max-w-[88%] text-sm leading-relaxed text-white/62 sm:text-[15px]">
                                  {r.description?.trim()
                                    ? r.description
                                    : "Canjeable en barra presentando tu QR."}
                                </p>
                              </div>

                              <div className="mt-5 border-t border-white/10 pt-4 text-center">
                                <div
                                  className={`text-[12px] font-black uppercase tracking-[0.22em] ${tier.accent}`}
                                >
                                  PRECIO
                                </div>

                                <div className="mt-2 flex items-end justify-center gap-2">
                                  <span
                                    className={`holy-price-pulse text-[52px] font-black leading-none text-white sm:text-[62px] ${tier.priceGlow}`}
                                  >
                                    {r.points_cost.toLocaleString("es-AR")}
                                  </span>
                                  <span className="pb-2 text-sm font-bold uppercase tracking-[0.12em] text-white/45">
                                    créditos
                                  </span>
                                </div>
                              </div>

                              <div className="mt-auto pt-5">
                                <div className="rounded-[22px] border border-white/10 bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <p
                                        className={`text-sm font-medium ${
                                          localInsufficient
                                            ? "text-white/36"
                                            : "text-white/70"
                                        }`}
                                      >
                                        {localInsufficient
                                          ? "No te alcanza el saldo actual"
                                          : "Canje instantáneo en barra"}
                                      </p>

                                      <div className="mt-2 flex flex-wrap items-center gap-2">
                                        {!localInsufficient ? (
                                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                                            Disponible ahora
                                          </span>
                                        ) : (
                                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/45">
                                            Te faltan créditos
                                          </span>
                                        )}

                                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/55">
                                          QR con vencimiento
                                        </span>
                                      </div>
                                    </div>

                                    <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 sm:flex">
                                      <Trophy
                                        className={`h-5 w-5 ${tier.accent}`}
                                      />
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => redeem(r)}
                                    disabled={disabled}
                                    className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[18px] px-5 py-4 text-sm font-black transition ${
                                      disabled
                                        ? "cursor-not-allowed bg-white/10 text-white/35"
                                        : "bg-[linear-gradient(135deg,#d946ef,#a21caf)] text-white shadow-[0_0_34px_rgba(217,70,239,0.28)] hover:scale-[1.01] hover:shadow-[0_0_42px_rgba(217,70,239,0.34)] active:scale-[0.99]"
                                    }`}
                                  >
                                    {isGuest
                                      ? "Iniciá sesión"
                                      : loadingBalance
                                      ? "Cargando saldo..."
                                      : isLoading
                                      ? "Generando QR..."
                                      : localInsufficient
                                      ? "No te alcanza"
                                      : "Canjear"}

                                    {!disabled && (
                                      <ArrowRight className="h-4 w-4" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-2">
                {rewards.map((reward, index) => {
                  const tier = getTierStyles(reward.points_cost, true);
                  const active = index === activeIndex;

                  return (
                    <button
                      key={reward.id}
                      onClick={() => scrollToCard(index)}
                      className={`h-2.5 rounded-full transition-all ${
                        active ? `w-8 ${tier.dot}` : "w-2.5 bg-white/20"
                      }`}
                      aria-label={`Ir al reward ${index + 1}`}
                    />
                  );
                })}
              </div>

              <div className="text-center text-sm text-white/45">
                {rewards.length > 0 ? activeIndex + 1 : 0} / {rewards.length}
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
        @keyframes holyPulseCard {
          0%,
          100% {
            transform: scale(1);
            filter: brightness(1);
          }
          50% {
            transform: scale(1.006);
            filter: brightness(1.08);
          }
        }

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
            opacity: 0.92;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.025);
          }
        }

        .holy-card-pulse {
          animation: holyPulseCard 2.8s ease-in-out infinite;
        }

        .holy-card-orb,
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