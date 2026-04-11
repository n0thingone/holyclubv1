"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Lock,
  Gift,
  QrCode,
  Sparkles,
  Instagram,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Beer,
  Martini,
  Pizza,
  UtensilsCrossed,
  Crown,
  Zap,
} from "lucide-react";

import DashboardShell from "@/components/navigation/DashboardShell";
import HolyCoin from "@/components/ui/HolyCoin";
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
  status?: string | null;
};

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
      return "VIP";
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
  if (n.includes("vip") || n.includes("gold") || n.includes("entrada")) {
    return Crown;
  }

  return Gift;
}

function getTierStyles(points: number, active: boolean) {
  const tier = getRewardTier(points);
  const activeState = active
    ? "scale-[1.01] opacity-100"
    : "scale-[0.97] opacity-70";

  switch (tier) {
    case "common":
      return {
        wrap: `${activeState} border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]`,
        badge: "border-white/10 bg-white/8 text-white/80",
        glow: "bg-white/10",
        accent: "text-white",
        button:
          "border-white/10 bg-white/6 text-white/80 hover:bg-white/10 active:bg-white/10",
      };
    case "rare":
      return {
        wrap: `${activeState} border-cyan-400/25 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(34,211,238,0.04))] shadow-[0_0_24px_rgba(34,211,238,0.08)]`,
        badge: "border-cyan-400/20 bg-cyan-500/10 text-cyan-300",
        glow: "bg-cyan-400/15",
        accent: "text-cyan-300",
        button:
          "border-cyan-400/20 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/15 active:bg-cyan-500/15",
      };
    case "epic":
      return {
        wrap: `${activeState} border-fuchsia-400/25 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.20),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(217,70,239,0.04))] shadow-[0_0_26px_rgba(217,70,239,0.10)]`,
        badge: "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-300",
        glow: "bg-fuchsia-400/18",
        accent: "text-fuchsia-300",
        button:
          "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-200 hover:bg-fuchsia-500/15 active:bg-fuchsia-500/15",
      };
    case "legendary":
      return {
        wrap: `${activeState} border-amber-400/30 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.20),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(251,191,36,0.04))] shadow-[0_0_28px_rgba(251,191,36,0.10)]`,
        badge: "border-amber-400/20 bg-amber-500/10 text-amber-300",
        glow: "bg-amber-400/18",
        accent: "text-amber-300",
        button:
          "border-amber-400/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15 active:bg-amber-500/15",
      };
    default:
      return {
        wrap: `${activeState} border-white/10 bg-white/5`,
        badge: "border-white/10 bg-white/8 text-white/80",
        glow: "bg-white/10",
        accent: "text-white",
        button:
          "border-white/10 bg-white/6 text-white/80 hover:bg-white/10 active:bg-white/10",
      };
  }
}

function getNextGoal(balance: number) {
  const goals = [5000, 9000, 15000, 25000, 40000, 60000, 100000];
  const next = goals.find((goal) => balance < goal);
  return next ?? null;
}

export default function PuntosHomePage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activeEvent, setActiveEvent] = useState<EventRow | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [activeRewardIndex, setActiveRewardIndex] = useState(0);
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  const sliderRef = useRef<HTMLDivElement | null>(null);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const interactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const prevBalanceRef = useRef(0);

  const realBalance = isGuest
    ? 0
    : Number((profile as any)?.holy_points_balance ?? 0);

  const [animatedBalance, setAnimatedBalance] = useState(realBalance);

  const activeReward = rewards[activeRewardIndex] ?? null;
  const nextGoal = getNextGoal(realBalance);
  const progressToGoal = nextGoal
    ? Math.max(0, Math.min(100, (realBalance / nextGoal) * 100))
    : 100;

  useEffect(() => {
    setIsGuest(getIsGuest());
  }, []);

  useEffect(() => {
    async function loadHomeData() {
      if (isGuest) {
        setLoading(false);
        setRewards([]);
        setActiveEvent(null);
        return;
      }

      setLoading(true);

      const [{ data: eventData }, { data: rewardsData, error: rewardsError }] =
        await Promise.all([
          supabase.from("events").select("id,name,status").eq("status", "active").maybeSingle(),
          supabase
            .from("holy_rewards")
            .select("id,name,description,points_cost")
            .eq("active", true)
            .order("points_cost", { ascending: true })
            .limit(8),
        ]);

      setActiveEvent((eventData as EventRow | null) ?? null);
      setRewards((rewardsData ?? []) as Reward[]);

      if (rewardsError) {
        console.error("Error cargando rewards del home:", rewardsError);
      }

      setLoading(false);
    }

    void loadHomeData();
  }, [isGuest, supabase]);

  useEffect(() => {
    if (prevBalanceRef.current === realBalance) {
      setAnimatedBalance(realBalance);
      return;
    }

    const start = prevBalanceRef.current;
    const end = realBalance;
    const duration = 650;
    let startTime: number | null = null;

    function step(timestamp: number) {
      if (startTime === null) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(start + (end - start) * eased);

      setAnimatedBalance(value);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        prevBalanceRef.current = end;
      }
    }

    requestAnimationFrame(step);
  }, [realBalance]);

  function markUserInteraction() {
    setIsUserInteracting(true);

    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }

    interactionTimeoutRef.current = setTimeout(() => {
      setIsUserInteracting(false);
    }, 4500);
  }

  function scrollToCard(index: number) {
    const container = sliderRef.current;
    if (!container) return;

    const children = container.children;
    if (!children[index]) return;

    const el = children[index] as HTMLElement;

    container.scrollTo({
      left: el.offsetLeft - 12,
      behavior: "smooth",
    });

    setActiveRewardIndex(index);
  }

  function goPrevReward() {
    if (rewards.length === 0) return;
    markUserInteraction();
    scrollToCard(Math.max(activeRewardIndex - 1, 0));
  }

  function goNextReward() {
    if (rewards.length === 0) return;
    markUserInteraction();
    scrollToCard(Math.min(activeRewardIndex + 1, rewards.length - 1));
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

    setActiveRewardIndex((prev) =>
      prev !== closestIndex ? closestIndex : prev
    );
  }

  useEffect(() => {
    if (!rewards.length || isUserInteracting) return;

    autoScrollRef.current = setInterval(() => {
      setActiveRewardIndex((prev) => {
        const nextIndex = prev >= rewards.length - 1 ? 0 : prev + 1;
        scrollToCard(nextIndex);
        return nextIndex;
      });
    }, 3200);

    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    };
  }, [rewards.length, isUserInteracting]);

  useEffect(() => {
    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
      if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
    };
  }, []);

  return (
    <DashboardShell title="HOLY CLUB">
      <div className="px-3 pb-24 pt-4 text-white">
        <div className="space-y-3">
          {isGuest && (
            <div className="rounded-[28px] border border-amber-500/25 bg-amber-500/10 p-5">
              <div className="flex gap-4">
                <Lock className="mt-1 text-amber-300" />
                <div>
                  <p className="text-xs uppercase tracking-widest text-amber-300">
                    Modo invitado
                  </p>
                  <h2 className="font-bold text-white">Estás explorando la app</h2>
                  <p className="text-sm text-amber-100/70">
                    Iniciá sesión para usar créditos y beneficios.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-[30px] border border-fuchsia-500/25 bg-white/5 p-5 shadow-[0_0_60px_rgba(217,70,239,0.15)]">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-fuchsia-300">
              <Sparkles size={14} />
              Hoy en HOLY
            </div>

            <h2 className="mt-3 text-3xl font-black">
              {loading ? "Cargando..." : activeEvent?.name || "SIN EVENTO"}
            </h2>

            <p className="mt-2 text-sm text-white/60">
              {isGuest
                ? "Entrá para usar beneficios"
                : "Lista activa, rewards disponibles y todo listo para esta noche."}
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-wider text-white/40">
              Tus créditos
            </p>

            <div className="mt-2 flex items-end justify-between gap-3">
              <div className="flex items-center gap-3">
                <HolyCoin size={48} />
                <span className="bg-[radial-gradient(circle,rgba(255,255,255,0.16),transparent_70%)] bg-clip-text text-5xl font-black leading-none text-white">
                  {animatedBalance.toLocaleString("es-AR")}
                </span>
              </div>

              <span className="rounded-full bg-fuchsia-500/10 px-3 py-1 text-xs text-fuchsia-300">
                CRÉDITOS
              </span>
            </div>
          </div>

     

          <div className="space-y-3">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10">
                    <Instagram size={18} className="text-fuchsia-400" />
                  </div>

                  <div>
                    <p className="text-sm font-bold">Seguinos</p>
                    <p className="text-xs text-white/50">@holy.club</p>
                  </div>
                </div>

                <a
                  href="https://instagram.com/holy.club"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-fuchsia-600 px-4 py-2 text-sm font-bold active:scale-95"
                >
                  Seguir
                </a>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10">
                    <MessageCircle size={18} className="text-emerald-300" />
                  </div>

                  <div>
                    <p className="text-sm font-bold">Escribinos</p>
                    <p className="text-xs text-white/50">2984 22-9239</p>
                  </div>
                </div>

                <a
                  href="https://wa.me/5492984229239"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold active:scale-95"
                >
                  WhatsApp
                </a>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(217,70,239,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4">
            <div className="pointer-events-none absolute left-1/2 top-0 h-28 w-40 -translate-x-1/2 rounded-full bg-fuchsia-500/15 blur-3xl" />

            <div className="relative z-10">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-200">
                    <Zap size={12} />
                    Top canje
                  </div>

                  <h3 className="text-lg font-black text-white">
                    {activeReward?.name ?? "Canjes HOLY"}
                  </h3>

                  <p className="mt-1 text-xs text-white/45">
                    Canjeá desde 5.000 créditos
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={goPrevReward}
                    disabled={activeRewardIndex === 0}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80 disabled:opacity-35"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <button
                    onClick={goNextReward}
                    disabled={
                      rewards.length === 0 ||
                      activeRewardIndex === rewards.length - 1
                    }
                    className="inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80 disabled:opacity-35"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {!isGuest && (
                <div className="mb-3 rounded-[20px] border border-white/10 bg-black/20 p-3">
                  {nextGoal ? (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold text-white/80">
                          Te faltan{" "}
                          <span className="text-fuchsia-300">
                            {(nextGoal - realBalance).toLocaleString("es-AR")}
                          </span>{" "}
                          créditos para el próximo objetivo
                        </p>

                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                          {nextGoal.toLocaleString("es-AR")}
                        </span>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-violet-400 to-cyan-400 transition-all duration-500"
                          style={{ width: `${progressToGoal}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="text-xs font-semibold text-amber-200">
                      Ya estás en rango alto. Es momento de romperla en canjes.
                    </p>
                  )}
                </div>
              )}

              {rewards.length === 0 ? (
                <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-5 text-center text-sm text-white/50">
                  No hay rewards disponibles ahora.
                </div>
              ) : (
                <>
                  <div
                    ref={sliderRef}
                    onScroll={handleSliderScroll}
                    onTouchStart={markUserInteraction}
                    onMouseDown={markUserInteraction}
                    className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {rewards.map((reward, index) => {
                      const isActive = index === activeRewardIndex;
                      const tier = getTierStyles(reward.points_cost, isActive);
                      const tierLabel = getTierLabel(reward.points_cost);
                      const RewardIcon = getRewardIcon(reward.name);

                      return (
                        <div
                          key={reward.id}
                          className="min-w-0 shrink-0 basis-[66%] snap-center"
                        >
                          <div
                            className={`relative overflow-hidden rounded-[24px] border p-3 transition duration-300 ${tier.wrap} ${
                              isActive
                                ? "shadow-[0_0_35px_rgba(217,70,239,0.16)]"
                                : ""
                            }`}
                          >
                            <div
                              className={`pointer-events-none absolute -left-8 top-0 h-16 w-16 rounded-full blur-3xl ${tier.glow}`}
                            />
                            <div
                              className={`pointer-events-none absolute bottom-0 right-0 h-16 w-16 rounded-full blur-3xl ${tier.glow}`}
                            />

                            <div className="relative z-10 flex aspect-square flex-col">
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.2em] ${tier.badge}`}
                                >
                                  {tierLabel}
                                </span>

                                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/35">
                                  HOLY
                                </span>
                              </div>

                              <div className="flex flex-1 flex-col items-center justify-center text-center">
                                <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-[18px] border border-white/10 bg-black/20 shadow-[0_0_24px_rgba(255,255,255,0.05)]">
                                  <RewardIcon className={`h-7 w-7 ${tier.accent}`} />
                                </div>

                                <h4 className="max-w-[92%] text-base font-black leading-tight text-white">
                                  {reward.name}
                                </h4>

                                <p className="mt-1 line-clamp-2 text-[11px] text-white/50">
                                  {reward.description || "Canjeable en HOLY."}
                                </p>
                              </div>

                              <div className="mt-auto flex items-end justify-between gap-3">
                                <div>
                                  <p className="text-[9px] uppercase tracking-[0.18em] text-white/35">
                                    Precio
                                  </p>
                                  <p className="text-xl font-black text-white">
                                    {reward.points_cost.toLocaleString("es-AR")}
                                  </p>
                                </div>

                                <Link
                                  href="/dashboard/puntos"
                                  className={`rounded-2xl border px-3 py-2 text-[11px] font-bold transition ${tier.button}`}
                                >
                                  Canjear
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex items-center justify-center gap-2">
                    {rewards.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          markUserInteraction();
                          scrollToCard(index);
                        }}
                        className={`h-2.5 rounded-full transition ${
                          index === activeRewardIndex
                            ? "w-6 bg-white"
                            : "w-2.5 bg-white/20"
                        }`}
                        aria-label={`Ir al reward ${index + 1}`}
                      />
                    ))}
                  </div>

                  <Link href="/dashboard/puntos" className="mt-4 block">
                    <div className="rounded-[22px] border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-3 text-center text-sm font-bold text-fuchsia-200 transition active:scale-[0.99]">
                      Ver todos los beneficios
                    </div>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}