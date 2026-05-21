// @ts-nocheck
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Lock,
  Gift,
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
  Ticket,
  Shuffle,
  UserPlus,
} from "lucide-react";

import DashboardShell from "@/components/navigation/DashboardShell";
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

type RRPPRow = {
  slug: string;
  profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
};

function getIsGuest() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("holy_guest") === "true";
}

function shuffleArray<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function getRRPPName(rrpp: RRPPRow) {
  return rrpp.profiles?.full_name || rrpp.profiles?.email || "RRPP";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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
  if (n.includes("vip") || n.includes("gold") || n.includes("entrada")) return Crown;

  return Gift;
}

function getTierStyles(points: number, active: boolean) {
  const tier = getRewardTier(points);
  const activeState = active ? "scale-[1.01] opacity-100" : "scale-[0.97] opacity-70";

  switch (tier) {
    case "common":
      return {
        wrap: `${activeState} border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]`,
        badge: "border-white/10 bg-white/8 text-white/80",
        glow: "bg-white/10",
        accent: "text-white",
        button: "border-white/10 bg-white/6 text-white/80 hover:bg-white/10 active:bg-white/10",
      };
    case "rare":
      return {
        wrap: `${activeState} border-cyan-400/25 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(34,211,238,0.04))] shadow-[0_0_24px_rgba(34,211,238,0.08)]`,
        badge: "border-cyan-400/20 bg-cyan-500/10 text-cyan-300",
        glow: "bg-cyan-400/15",
        accent: "text-cyan-300",
        button: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/15 active:bg-cyan-500/15",
      };
    case "epic":
      return {
        wrap: `${activeState} border-fuchsia-400/25 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.20),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(217,70,239,0.04))] shadow-[0_0_26px_rgba(217,70,239,0.10)]`,
        badge: "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-300",
        glow: "bg-fuchsia-400/18",
        accent: "text-fuchsia-300",
        button: "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-200 hover:bg-fuchsia-500/15 active:bg-fuchsia-500/15",
      };
    case "legendary":
      return {
        wrap: `${activeState} border-amber-400/30 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.20),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(251,191,36,0.04))] shadow-[0_0_28px_rgba(251,191,36,0.10)]`,
        badge: "border-amber-400/20 bg-amber-500/10 text-amber-300",
        glow: "bg-amber-400/18",
        accent: "text-amber-300",
        button: "border-amber-400/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15 active:bg-amber-500/15",
      };
    default:
      return {
        wrap: `${activeState} border-white/10 bg-white/5`,
        badge: "border-white/10 bg-white/8 text-white/80",
        glow: "bg-white/10",
        accent: "text-white",
        button: "border-white/10 bg-white/6 text-white/80 hover:bg-white/10 active:bg-white/10",
      };
  }
}

function getNextGoal(balance: number) {
  const goals = [5000, 9000, 15000, 25000, 40000, 60000, 100000];
  const next = goals.find((goal) => balance < goal);
  return next ?? null;
}

function getRankByLevel(level: number) {
  switch (level) {
    case 1:
      return "Visitante";
    case 2:
      return "Habitual";
    case 3:
      return "Fiel HOLY";
    case 4:
      return "Nocturno";
    case 5:
      return "Elite HOLY";
    case 6:
      return "Leyenda HOLY";
    case 7:
      return "Mítico";
    case 8:
      return "Inmortal HOLY";
    default:
      return "Visitante";
  }
}

function getFrameByLevel(level: number) {
  if (level >= 8) {
    return "border-amber-300/60 bg-amber-400/15 shadow-[0_0_34px_rgba(251,191,36,0.30)]";
  }

  if (level >= 7) {
    return "border-amber-300/45 bg-amber-400/12 shadow-[0_0_28px_rgba(251,191,36,0.22)]";
  }

  if (level >= 5) {
    return "border-fuchsia-300/45 bg-fuchsia-500/12 shadow-[0_0_26px_rgba(217,70,239,0.20)]";
  }

  if (level >= 4) {
    return "border-violet-300/35 bg-violet-500/10 shadow-[0_0_22px_rgba(139,92,246,0.16)]";
  }

  if (level >= 3) {
    return "border-cyan-300/35 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.12)]";
  }

  if (level >= 2) {
    return "border-white/20 bg-white/8 shadow-[0_0_18px_rgba(255,255,255,0.08)]";
  }

  return "border-white/10 bg-white/5";
}

function HolyProgressHUD() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { profile } = useAuth();

  const [progress, setProgress] = useState<{
    xp: number;
    level: number;
    free_boxes: number;
  } | null>(null);

  useEffect(() => {
    async function loadProgress() {
      if (!profile?.id) return;

      const { data, error } = await supabase
        .from("holy_user_progress")
        .select("xp, level, free_boxes")
        .eq("user_id", profile.id)
        .maybeSingle();

      if (error) {
        console.error("Error cargando progreso HOLY:", error);
        return;
      }

      if (data) {
        setProgress({
          xp: Number(data.xp ?? 0),
          level: Number(data.level ?? 1),
          free_boxes: Number(data.free_boxes ?? 0),
        });
      } else {
        setProgress({ xp: 0, level: 1, free_boxes: 0 });
      }
    }

    void loadProgress();
  }, [profile?.id, supabase]);

  if (!progress) return null;

  const levelThresholds = [0, 200, 500, 900, 1400, 2000, 2700, 3500];
  const level = Math.max(1, Math.min(8, progress.level || 1));
  const xp = progress.xp || 0;
  const currentLevelMin = levelThresholds[level - 1] ?? 0;
  const nextLevelMin = levelThresholds[level] ?? currentLevelMin;
  const isMaxLevel = level >= 8;
  const progressInLevel = isMaxLevel ? nextLevelMin - currentLevelMin : xp - currentLevelMin;
  const needed = Math.max(1, nextLevelMin - currentLevelMin);
  const percent = isMaxLevel
    ? 100
    : Math.max(0, Math.min(100, (progressInLevel / needed) * 100));
  const xpLeft = isMaxLevel ? 0 : Math.max(0, nextLevelMin - xp);
  const rank = getRankByLevel(level);
  const frameClass = getFrameByLevel(level);

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-fuchsia-400/20 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.20),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.028))] p-2.5 shadow-[0_0_28px_rgba(217,70,239,0.10)]">
      <div className="pointer-events-none absolute -left-10 top-0 h-24 w-24 rounded-full bg-fuchsia-500/16 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-0 h-24 w-24 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative z-10 flex items-center gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border ${frameClass}`}>
          <Crown className={level >= 6 ? "h-5 w-5 text-amber-200" : "h-5 w-5 text-fuchsia-200"} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-fuchsia-300">
                Progreso HOLY
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <p className="text-sm font-black leading-none text-white">
                  Nivel {level}
                </p>
                <span className="rounded-full border border-white/10 bg-white/8 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-white/75">
                  {rank}
                </span>
              </div>
            </div>

            {progress.free_boxes > 0 ? (
              <Link
                href="/dashboard/beneficios/mystery-box"
                className="holy-shimmer relative shrink-0 overflow-hidden rounded-full border border-amber-300/50 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.32),transparent_45%),linear-gradient(90deg,rgba(251,191,36,0.20),rgba(217,70,239,0.14))] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100 shadow-[0_0_20px_rgba(251,191,36,0.24)] transition active:scale-[0.96]"
              >
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  <Gift className="h-3.5 w-3.5 text-amber-200" />
                  <span>{progress.free_boxes}</span>
                  <span>HOLY BOX</span>
                </span>
              </Link>
            ) : null}
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-violet-400 to-cyan-400 shadow-[0_0_16px_rgba(217,70,239,0.45)] transition-all duration-700"
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold text-white/55">
              {isMaxLevel ? "Rango máximo desbloqueado" : `Faltan ${xpLeft} XP para Nivel ${level + 1}`}
            </p>
            <p className="shrink-0 text-[10px] font-black text-white/70">
              {isMaxLevel ? `${xp} XP` : `${xp}/${nextLevelMin} XP`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PuntosHomePage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activeEvent, setActiveEvent] = useState<EventRow | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [rrpps, setRrpps] = useState<RRPPRow[]>([]);
  const [randomRRPP, setRandomRRPP] = useState<RRPPRow | null>(null);
  const [activeRewardIndex, setActiveRewardIndex] = useState(0);
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  const sliderRef = useRef<HTMLDivElement | null>(null);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const interactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const realBalance = isGuest ? 0 : Number((profile as any)?.holy_points_balance ?? 0);

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
      setLoading(true);

  const { data: rrppData, error: rrppError } = await supabase
  .from("rrpp_profiles")
  .select(`
    slug,
    profiles (
      id,
      full_name,
      email
    )
  `)
  .eq("active", true)
  .not("slug", "is", null);

      if (rrppError) {
        console.error("Error cargando RRPP:", rrppError);
      }

      const cleanRRPP = ((rrppData ?? []) as unknown as RRPPRow[]).filter(
        (rrpp) => Boolean(rrpp.slug)
      );

      const shuffledRRPP = shuffleArray(cleanRRPP);
      setRrpps(shuffledRRPP);
      setRandomRRPP(shuffledRRPP[0] ?? null);

      if (isGuest) {
        setLoading(false);
        setRewards([]);
        setActiveEvent(null);
        return;
      }

      const [{ data: eventData }, { data: rewardsData, error: rewardsError }] =
        await Promise.all([
          supabase
            .from("events")
            .select("id,name,status")
            .eq("status", "active")
            .maybeSingle(),
          supabase
        
  .from("holy_rewards")
  .select("id,name,description,points_cost")
  .eq("active", true)
  .gt("points_cost", 0) // 👈 ESTE ES EL FIX
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

    setActiveRewardIndex((prev) => (prev !== closestIndex ? closestIndex : prev));
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
    <DashboardShell title="HOME">
      <style jsx global>{`
        @keyframes holyEventPulse {
          0% {
            box-shadow: 0 0 18px rgba(217, 70, 239, 0.08);
            transform: scale(1);
          }

          50% {
            box-shadow:
              0 0 34px rgba(217, 70, 239, 0.38),
              0 0 12px rgba(16, 185, 129, 0.16);
            transform: scale(1.012);
          }

          100% {
            box-shadow: 0 0 18px rgba(217, 70, 239, 0.08);
            transform: scale(1);
          }
        }

        @keyframes holyListaGlow {
          0% {
            box-shadow: 0 0 18px rgba(217, 70, 239, 0.1);
          }

          50% {
            box-shadow:
              0 0 36px rgba(217, 70, 239, 0.26),
              0 0 16px rgba(251, 191, 36, 0.12);
          }

          100% {
            box-shadow: 0 0 18px rgba(217, 70, 239, 0.1);
          }
        }

        @keyframes holyShimmer {
          0% {
            transform: translateX(-130%) rotate(12deg);
          }
          100% {
            transform: translateX(180%) rotate(12deg);
          }
        }

        @keyframes holySectionFade {
          0% {
            opacity: 0.45;
          }

          50% {
            opacity: 1;
          }

          100% {
            opacity: 0.45;
          }
        }

        .holy-event-pulse {
          animation: holyEventPulse 2.6s ease-in-out infinite;
          transform-origin: center;
        }

        .holy-lista-glow {
          animation: holyListaGlow 2.9s ease-in-out infinite;
        }

        .holy-section-divider {
          animation: holySectionFade 3s ease-in-out infinite;
        }

        .holy-shimmer::after {
          content: "";
          position: absolute;
          top: -35%;
          left: 0;
          width: 42%;
          height: 170%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.22),
            transparent
          );
          animation: holyShimmer 3.2s ease-in-out infinite;
          pointer-events: none;
        }
      `}</style>

      <div className="px-3 pb-24 pt-2 text-white">
        <div className="space-y-4">
          {isGuest && (
            <div className="rounded-[22px] border border-amber-500/25 bg-amber-500/10 p-3">
              <div className="flex gap-3">
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

          {!isGuest && <HolyProgressHUD />}

          <div className="holy-lista-glow relative overflow-hidden rounded-[24px] border border-fuchsia-400/20 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.14),transparent_25%),radial-gradient(circle_at_top_right,rgba(217,70,239,0.24),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-2.5">
            <div className="pointer-events-none absolute -left-10 top-0 h-24 w-24 rounded-full bg-amber-400/14 blur-3xl" />
            <div className="pointer-events-none absolute -right-8 bottom-0 h-24 w-24 rounded-full bg-fuchsia-500/20 blur-3xl" />

            <div className="relative z-10">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-amber-200">
                    <Ticket size={11} />
                    Acceso rápido
                  </div>

                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black leading-none text-white">
                      LISTA FREE
                    </h2>

                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-300">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      </span>
                      {loading ? "..." : activeEvent?.name || "SIN EVENTO"}
                    </span>
                  </div>
                </div>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border border-fuchsia-400/20 bg-fuchsia-500/10">
                  <UserPlus className="h-5 w-5 text-fuchsia-200" />
                </div>
              </div>

              {randomRRPP ? (
                <Link href={`/lista/${randomRRPP.slug}`} className="block">
                  <div className="holy-shimmer relative mb-2 overflow-hidden rounded-[18px] border border-amber-300/30 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 px-3 py-2.5 text-black shadow-[0_0_22px_rgba(251,191,36,0.16)] active:scale-[0.99]">
                    <div className="relative z-10 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-black/55">
                          Entrar rápido
                        </p>
                        <p className="text-sm font-black leading-tight">
                          ELEGIR POR MÍ
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 rounded-full bg-black/12 px-2.5 py-1">
                        <Shuffle className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-black">RANDOM</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="mb-2 rounded-[18px] border border-white/10 bg-black/20 px-3 py-2 text-center">
                  <p className="text-xs font-bold text-white/70">
                    Todavía no hay RRPP activos con link.
                  </p>
                </div>
              )}

              {rrpps.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {rrpps.slice(0, 8).map((rrpp) => {
                    const name = getRRPPName(rrpp);
                    const initials = getInitials(name);

                    return (
                      <Link
                        key={rrpp.slug}
                        href={`/lista/${rrpp.slug}`}
                        className="min-w-[98px] rounded-[18px] border border-white/10 bg-black/22 p-2 text-center transition active:scale-[0.97]"
                      >
                        <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-[13px] border border-fuchsia-400/20 bg-fuchsia-500/10 text-xs font-black text-fuchsia-100">
                          {initials}
                        </div>

                        <p className="truncate text-[11px] font-black text-white">
                          {name}
                        </p>

                        <p className="mt-0.5 text-[8px] font-black uppercase tracking-[0.13em] text-emerald-300/80">
                          Lista abierta
                        </p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="holy-section-divider my-1 flex items-center gap-3 px-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-fuchsia-300/25 to-transparent" />
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-white/45">
              <Sparkles className="h-3 w-3 text-fuchsia-300" />
              Canjes y beneficios
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-fuchsia-300/25 to-transparent" />
          </div>

          <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(217,70,239,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-2">
            <div className="pointer-events-none absolute left-1/2 top-0 h-24 w-40 -translate-x-1/2 rounded-full bg-fuchsia-500/15 blur-3xl" />

            <div className="relative z-10">
              <div className="mb-1 flex items-start justify-between gap-2">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-200">
                    <Zap size={12} />
                    Top canje
                  </div>

                  <h3 className="text-lg font-black leading-none text-white">
                    {activeReward?.name ?? "Canjes HOLY"}
                  </h3>
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
                    disabled={rewards.length === 0 || activeRewardIndex === rewards.length - 1}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80 disabled:opacity-35"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

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
                          className="min-w-0 shrink-0 basis-[55%] snap-center"
                        >
                          <div
                            className={`relative overflow-hidden rounded-[22px] border p-3 transition duration-300 ${tier.wrap} ${
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

                            <div className="relative z-10 flex h-[170px] flex-col">
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
                                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-[16px] border border-white/10 bg-black/20 shadow-[0_0_24px_rgba(255,255,255,0.05)]">
                                  <RewardIcon className={`h-6 w-6 ${tier.accent}`} />
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

                  <div className="mt-2 flex items-center justify-center gap-2">
                    {rewards.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          markUserInteraction();
                          scrollToCard(index);
                        }}
                        className={`h-2.5 rounded-full transition ${
                          index === activeRewardIndex ? "w-6 bg-white" : "w-2.5 bg-white/20"
                        }`}
                        aria-label={`Ir al reward ${index + 1}`}
                      />
                    ))}
                  </div>

               <Link href="/dashboard/puntos/home" className="mt-3 block">
                    <div className="rounded-[20px] border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-2 text-center text-sm font-bold text-fuchsia-200 transition active:scale-[0.99]">
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