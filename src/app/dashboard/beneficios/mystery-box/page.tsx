"use client";
import LevelUpModal from "@/components/progress/LevelUpModal";
import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gift,
  Zap,
  Stars,
  Sparkles,
  Crown,
  Lock,
  Coins,
  PartyPopper,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";

type Rarity = "common" | "rare" | "epic" | "legendary";

type BoxReward = {
  id: string;
  name: string;
  rarity: Rarity;
  chance: number;
  type: "credits" | "reward";
  value?: number;
  description: string;
};

type RpcResult = {
  reward: string;
  balance?: number | null;
};

const BOX_COST = 3000;

const rewards: BoxReward[] = [
  {
    id: "nothing",
    name: "NADA 😅",
    rarity: "common",
    chance: 45,
    type: "reward",
    description: "No salió premio… pero la próxima puede ser épica.",
  },
  {
    id: "500_credits",
    name: "500 CRÉDITOS",
    rarity: "common",
    chance: 25,
    type: "credits",
    value: 500,
    description: "Volvés a sumar una parte para seguir jugando.",
  },
  {
  id: "10000_credits",
  name: "10.000 CRÉDITOS",
  rarity: "legendary",
  chance: 1,
  type: "credits",
  description: "Jackpot. Te llenaste."
},
  {
    id: "1000_credits",
    name: "1000 CRÉDITOS",
    rarity: "rare",
    chance: 15,
    type: "credits",
    value: 1000,
    description: "Buen drop. Te sirve para otro canje o seguir probando.",
  },
  {
    id: "2500_credits",
    name: "2500 CRÉDITOS",
    rarity: "epic",
    chance: 8,
    type: "credits",
    value: 2500,
    description: "Buen premio. Recuperás bastante de la caja.",
  },
  {
    id: "free_box",
    name: "HOLY BOX GRATIS",
    rarity: "rare",
    chance: 4,
    type: "reward",
    description: "Ganaste otra HOLY BOX para abrir gratis.",
  },
  {
    id: "pinta",
    name: "PINTA 500CC",
    rarity: "epic",
    chance: 2,
    type: "reward",
    description: "Una pinta bien fría para canjear en barra.",
  },
  {
    id: "chandon",
    name: "CHANDON DELICE",
    rarity: "legendary",
    chance: 1,
    type: "reward",
    description: "Premio top. Canjeable en barra.",
  },
  {
  id: "shot",
  name: "SHOT GRATIS",
  rarity: "rare",
  chance: 12,
  type: "reward",
  description: "Canjeable en barra en este evento.",
},
{
  id: "vaso_litro",
  name: "VASO DE LITRO",
  rarity: "epic",
  chance: 5,
  type: "reward",
  description: "Canjeable en barra.",
},
];

function isGuestUser() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("holy_guest") === "true";
}

function rarityLabel(rarity: Rarity) {
  switch (rarity) {
    case "common":
      return "COMÚN";
    case "rare":
      return "RARO";
    case "epic":
      return "ÉPICO";
    case "legendary":
      return "LEGENDARIO";
  }
}

function rarityClasses(rarity: Rarity) {
  switch (rarity) {
    case "common":
      return {
        badge: "border-white/20 bg-white/10 text-white",
        glow: "shadow-[0_0_40px_rgba(255,255,255,0.08)]",
      };
    case "rare":
      return {
        badge: "border-cyan-400/30 bg-cyan-500/10 text-cyan-300",
        glow: "shadow-[0_0_50px_rgba(34,211,238,0.18)]",
      };
    case "epic":
      return {
        badge: "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-300",
        glow: "shadow-[0_0_60px_rgba(217,70,239,0.2)]",
      };
    case "legendary":
      return {
        badge: "border-amber-400/30 bg-amber-500/10 text-amber-300",
        glow: "shadow-[0_0_70px_rgba(251,191,36,0.24)]",
      };
  }
}

function rarityIcon(rarity: Rarity) {
  switch (rarity) {
    case "common":
      return <Gift className="h-4 w-4" />;
    case "rare":
      return <Zap className="h-4 w-4" />;
    case "epic":
      return <Stars className="h-4 w-4" />;
    case "legendary":
      return <Crown className="h-4 w-4" />;
  }
}

function getRewardMeta(rewardId: string): BoxReward | null {
  return rewards.find((reward) => reward.id === rewardId) ?? null;
}


function rarityCasinoClasses(rarity: Rarity) {
  switch (rarity) {
    case "common":
      return {
        frame: "border-white/20 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_35%),linear-gradient(180deg,rgba(20,20,26,0.96),rgba(8,8,12,0.98))] shadow-[0_0_60px_rgba(255,255,255,0.08)]",
        orb: "from-white/35 via-white/10 to-transparent",
        text: "text-white",
        ring: "border-white/25 bg-white/10",
        button: "bg-white text-black hover:bg-white/90 shadow-[0_0_28px_rgba(255,255,255,0.22)]",
        particles: "bg-white/60 shadow-[0_0_12px_rgba(255,255,255,0.55)]",
      };
    case "rare":
      return {
        frame: "border-cyan-300/35 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.25),transparent_34%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.16),transparent_38%),linear-gradient(180deg,rgba(5,30,38,0.96),rgba(6,10,18,0.98))] shadow-[0_0_80px_rgba(34,211,238,0.20)]",
        orb: "from-cyan-300/40 via-cyan-400/12 to-transparent",
        text: "text-cyan-200",
        ring: "border-cyan-300/35 bg-cyan-400/10",
        button: "bg-cyan-400 text-black hover:bg-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.25)]",
        particles: "bg-cyan-200/70 shadow-[0_0_14px_rgba(34,211,238,0.8)]",
      };
    case "epic":
      return {
        frame: "border-fuchsia-300/35 bg-[radial-gradient(circle_at_top,rgba(217,70,239,0.30),transparent_34%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.16),transparent_38%),linear-gradient(180deg,rgba(31,6,48,0.97),rgba(7,6,15,0.98))] shadow-[0_0_95px_rgba(217,70,239,0.24)]",
        orb: "from-fuchsia-300/45 via-fuchsia-500/12 to-transparent",
        text: "text-fuchsia-200",
        ring: "border-fuchsia-300/35 bg-fuchsia-400/10",
        button: "bg-fuchsia-500 text-white hover:bg-fuchsia-400 shadow-[0_0_34px_rgba(217,70,239,0.35)]",
        particles: "bg-fuchsia-200/75 shadow-[0_0_16px_rgba(217,70,239,0.85)]",
      };
    case "legendary":
      return {
        frame: "border-amber-300/45 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.36),transparent_34%),radial-gradient(circle_at_bottom,rgba(217,70,239,0.15),transparent_38%),linear-gradient(180deg,rgba(55,32,5,0.98),rgba(9,7,12,0.98))] shadow-[0_0_120px_rgba(251,191,36,0.32)]",
        orb: "from-amber-200/55 via-yellow-400/16 to-transparent",
        text: "text-amber-200",
        ring: "border-amber-300/45 bg-amber-400/12",
        button: "bg-amber-300 text-black hover:bg-amber-200 shadow-[0_0_40px_rgba(251,191,36,0.40)]",
        particles: "bg-yellow-200/80 shadow-[0_0_18px_rgba(251,191,36,0.95)]",
      };
  }
}

export default function MysteryBoxPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { profile, loading, refreshProfile } = useAuth();
  const router = useRouter();

  const [isOpening, setIsOpening] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [openedReward, setOpenedReward] = useState<BoxReward | null>(null);
  const [history, setHistory] = useState<BoxReward[]>([]);
  const [showJackpot, setShowJackpot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [levelUpData, setLevelUpData] = useState<any>(null);
  const [freeBoxes, setFreeBoxes] = useState(0);
  const prizesScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsGuest(isGuestUser());
  }, []);

  useEffect(() => {
    const el = prizesScrollRef.current;
    if (!el) return;

    let animationFrame = 0;
    let lastTime = performance.now();
    const speed = 18; // px por segundo, suave tipo casino

    const tick = (time: number) => {
      const delta = Math.min(time - lastTime, 48) / 1000;
      lastTime = time;

      if (el.scrollWidth > el.clientWidth) {
        el.scrollLeft += speed * delta;
        const halfWidth = el.scrollWidth / 2;
        if (el.scrollLeft >= halfWidth) {
          el.scrollLeft = 0;
        }
      }

      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const userId = (profile as any)?.id ?? null;
const credits = isGuest ? 0 : Number((profile as any)?.holy_points_balance ?? 0);
  const hasFreeBox = freeBoxes > 0;
  const canOpen = !isGuest && (hasFreeBox || credits >= BOX_COST) && !isOpening && !loading;

  useEffect(() => {
    async function loadFreeBoxes() {
      if (!userId || isGuest) {
        setFreeBoxes(0);
        return;
      }

      const { data, error } = await supabase
        .from("holy_user_progress")
        .select("free_boxes")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error cargando Mystery Box gratis:", error);
        return;
      }

     setFreeBoxes(Number((data as any)?.free_boxes ?? 0));
    }

    void loadFreeBoxes();
  }, [userId, isGuest, supabase]);

  const rarityCount = useMemo(() => {
    return {
      common: rewards.filter((r) => r.rarity === "common").length,
      rare: rewards.filter((r) => r.rarity === "rare").length,
      epic: rewards.filter((r) => r.rarity === "epic").length,
      legendary: rewards.filter((r) => r.rarity === "legendary").length,
    };
  }, []);

  async function handleOpenBox() {
    if (isGuest) {
      setError("Iniciá sesión para usar la Mystery Box.");
      return;
    }

    if (!canOpen || !userId) return;

    setError(null);
    setOpenedReward(null);
    setShowJackpot(false);
    setIsOpening(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1700));
      setShowFlash(true);

      await new Promise((resolve) => setTimeout(resolve, 250));
      setShowFlash(false);

      const useFreeBox = hasFreeBox;

      const { data, error } = await (supabase as any).rpc("open_holy_mystery_box", {
        p_user_id: userId,
        p_use_free_box: useFreeBox,
      });

      if (error) throw error;

      const result = data as RpcResult | null;

      if (!result?.reward) {
        throw new Error("La caja no devolvió ningún premio.");
      }

      const rewardMeta = getRewardMeta(result.reward);

      if (!rewardMeta) {
        throw new Error(`Premio desconocido devuelto por la DB: ${result.reward}`);
      }

      setOpenedReward(rewardMeta);
      setHistory((prev) => [rewardMeta, ...prev].slice(0, 6));

      if (useFreeBox) {
        setFreeBoxes((prev) => Math.max(0, prev - 1));
      }

// 🧠 XP por abrir Mystery Box
const { data: xpData, error: xpError } = await (supabase as any).rpc("add_holy_xp", {
  p_user_id: userId,
  p_amount: 30,
  p_reason: "mystery_box",
});

if (xpError) {
  console.error("No se pudo sumar XP por Mystery Box:", xpError);
}

if (xpData?.level_up) {
  setLevelUpData(xpData);
}

      const { data: refreshedProgress } = await supabase
        .from("holy_user_progress")
        .select("free_boxes")
        .eq("user_id", userId)
        .maybeSingle();

      if (refreshedProgress) {
       setFreeBoxes(Number((refreshedProgress as any)?.free_boxes ?? 0));
      }

      // No pisamos el saldo con result.balance para evitar valores viejos.
      // La función SQL ya sincroniza profiles.holy_points_balance.
      // refreshProfile() recarga el saldo desde la fuente actual del AuthContext.
      await refreshProfile();

      if (rewardMeta.id === "10000_credits") {
        setShowJackpot(true);
        window.setTimeout(() => setShowJackpot(false), 2600);
      }
    } catch (err: any) {
      console.error("Error abriendo Mystery Box:", err);
      setError(err?.message || "No se pudo abrir la caja.");
    } finally {
      setIsOpening(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-3 px-3 pb-24 pt-1 text-white md:space-y-6 md:px-4 md:pt-2">
    <LevelUpModal
  open={Boolean(levelUpData)}
  level={levelUpData?.new_level ?? 1}
  rank={levelUpData?.rank ?? "Visitante"}
  freeBoxesAdded={levelUpData?.free_boxes_added ?? 0}
  creditsAdded={levelUpData?.credits_added ?? 0}
  onClose={() => setLevelUpData(null)}
/>
      <AnimatePresence>
        {showJackpot ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-[999] flex items-center justify-center bg-black/45 backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ y: 30, scale: 0.9 }}
              animate={{ y: 0, scale: 1 }}
              className="relative mx-4 w-full max-w-xl overflow-hidden rounded-[34px] border border-amber-400/30 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.22),transparent_30%),radial-gradient(circle_at_bottom,rgba(217,70,239,0.16),transparent_28%),linear-gradient(180deg,rgba(24,18,8,0.95),rgba(10,10,16,0.96))] px-6 py-10 text-center shadow-[0_0_120px_rgba(251,191,36,0.30)] sm:px-10 sm:py-12"
            >
              <div className="absolute inset-0 opacity-60">
                <div className="absolute left-10 top-10 h-24 w-24 rounded-full bg-amber-400/25 blur-3xl" />
                <div className="absolute right-10 bottom-10 h-24 w-24 rounded-full bg-fuchsia-500/20 blur-3xl" />
              </div>

              <div className="relative">
                <motion.div
                  animate={{ rotate: [0, -8, 8, -8, 0] }}
                  transition={{ duration: 0.7, repeat: 2 }}
                  className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-amber-400/30 bg-amber-500/10"
                >
                  <Crown className="h-10 w-10 text-amber-300" />
                </motion.div>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 }}
                  className="mt-5 text-sm font-black uppercase tracking-[0.35em] text-amber-300"
                >
                  JACKPOT
                </motion.p>

                <motion.h2
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.14 }}
                  className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl"
                >
                  10.000 CRÉDITOS
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mt-4 text-sm text-white/75 sm:text-base"
                >
                  Pegaste el premio grande de la HOLY BOX.
                </motion.p>

                <div className="mt-6 flex items-center justify-center gap-2 text-amber-300">
                  <PartyPopper className="h-5 w-5" />
                  <span className="font-bold">Premio legendario desbloqueado</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {isGuest ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-sm text-amber-300">
          Estás como invitado. Iniciá sesión para abrir la Mystery Box.
        </div>
      ) : null}

      <section className="relative hidden overflow-hidden rounded-[34px] border border-fuchsia-500/20 md:block bg-[radial-gradient(circle_at_top,rgba(217,70,239,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 shadow-[0_0_70px_rgba(168,85,247,0.18)] backdrop-blur-xl sm:p-6">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.20))]" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm leading-relaxed text-white/60 sm:text-[15px]">
              Gastá créditos HOLY y desbloqueá premios con rareza común, rara,
              épica o legendaria.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:min-w-[520px]">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                Tus créditos
              </p>
              <p className="mt-2 text-2xl font-black text-white">
                {loading ? "..." : credits.toLocaleString("es-AR")}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                Costo
              </p>
              <p className="mt-2 text-2xl font-black text-fuchsia-300">
                {BOX_COST.toLocaleString("es-AR")}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-amber-200/70">
                Legendarios
              </p>
              <p className="mt-2 text-2xl font-black text-amber-300">
                {rarityCount.legendary}
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/70">
                Épicos y raros
              </p>
              <p className="mt-2 text-2xl font-black text-cyan-300">
                {rarityCount.epic + rarityCount.rare}
              </p>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 2xl:grid-cols-[minmax(0,1.25fr)_420px] 2xl:gap-6">
        <section className="relative overflow-hidden rounded-[28px] border border-fuchsia-400/20 bg-[radial-gradient(circle_at_top,rgba(217,70,239,0.18),transparent_32%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.10),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-4 shadow-[0_0_70px_rgba(168,85,247,0.16)] backdrop-blur-xl sm:rounded-[34px] sm:p-6">
          <div className="pointer-events-none absolute inset-0 opacity-50">
            <div className="absolute left-1/2 top-8 h-40 w-40 -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-3xl" />
            <div className="absolute bottom-10 left-1/2 h-32 w-56 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
          </div>

          <div className="relative">
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-fuchsia-300 sm:text-[11px]">
                Box opening
              </p>
              <h2 className="mt-1 text-2xl font-black text-white sm:mt-2 sm:text-3xl">
                HOLY BOX
              </h2>
              <p className="mt-1 text-xs text-white/55 sm:mt-2 sm:text-sm">
                Abrila y descubrí qué te tocó esta noche.
              </p>

              {!isGuest ? (
                <div className="mx-auto mt-2 inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-amber-200">
                  🎰 Gratis: {freeBoxes}
                  <span className="text-white/35">·</span>
                  <span className="text-fuchsia-200">Comprar: {BOX_COST.toLocaleString("es-AR")}</span>
                </div>
              ) : null}

              <div className="mt-3 grid grid-cols-2 gap-2 md:hidden">
                <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-left">
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/35">
                    Créditos
                  </p>
                  <p className="mt-1 text-xl font-black text-white">
                    {loading ? "..." : credits.toLocaleString("es-AR")}
                  </p>
                </div>

                <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-2.5 text-left">
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/35">
                    Costo
                  </p>
                  <p className="mt-1 text-xl font-black text-fuchsia-300">
                    {BOX_COST.toLocaleString("es-AR")}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative mx-auto mt-4 flex min-h-[245px] w-full max-w-[560px] items-center justify-center sm:mt-8 sm:min-h-[420px]">
              <AnimatePresence>
                {showFlash ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-30 rounded-[32px] bg-white"
                  />
                ) : null}
              </AnimatePresence>

              {!openedReward ? (
                <motion.div
                  animate={
                    isOpening
                      ? {
                          rotate: [0, -3, 3, -3, 3, 0],
                          scale: [1, 1.04, 1, 1.04, 1],
                        }
                      : {
                          y: [0, -8, 0],
                        }
                  }
                  transition={
                    isOpening
                      ? {
                          duration: 0.7,
                          repeat: 2,
                          ease: "easeInOut",
                        }
                      : {
                          duration: 2.2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }
                  }
                  className="relative z-10 w-full max-w-[260px] sm:max-w-[360px]"
                >
                  <div className="absolute inset-x-8 bottom-2 h-10 rounded-full bg-fuchsia-500/25 blur-2xl" />

                  <div className="relative h-[175px] w-full rounded-[24px] border border-fuchsia-400/20 bg-[linear-gradient(180deg,rgba(29,9,50,0.96),rgba(10,10,16,0.98))] shadow-[0_0_80px_rgba(217,70,239,0.18)] sm:h-[250px] sm:rounded-[28px]">
                    <div className="absolute inset-x-4 top-4 h-7 rounded-2xl border border-white/10 bg-white/5 sm:top-5 sm:h-8" />
                    <div className="absolute inset-y-0 left-0 w-6 rounded-l-[28px] border-r border-fuchsia-400/20 bg-white/5" />
                    <div className="absolute inset-y-0 right-0 w-6 rounded-r-[28px] border-l border-fuchsia-400/20 bg-white/5" />
                    <div className="absolute inset-x-0 top-[77px] h-[8px] bg-fuchsia-500/70 shadow-[0_0_30px_rgba(217,70,239,0.75)] sm:top-[104px] sm:h-[10px]" />
                    <div className="absolute inset-x-0 top-[89px] h-[3px] bg-cyan-400/90 shadow-[0_0_26px_rgba(34,211,238,0.8)] sm:top-[118px]" />

                    <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[20px] border border-fuchsia-400/25 bg-black/30 shadow-[0_0_40px_rgba(217,70,239,0.22)] sm:h-20 sm:w-20 sm:rounded-[24px]">
                      <span className="text-3xl font-black text-fuchsia-300 sm:text-4xl">?</span>
                    </div>

                    <div className="absolute left-1/2 top-[45px] -translate-x-1/2 text-center sm:top-[62px]">
                      <p className="text-xs font-black uppercase tracking-[0.3em] text-white sm:text-sm">
                        HOLY
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.76, y: 28 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.48, ease: "easeOut" }}
                  className={`relative z-10 w-full max-w-[560px] overflow-hidden rounded-[30px] border p-4 text-center sm:rounded-[36px] sm:p-6 ${
                    rarityCasinoClasses(openedReward.rarity).frame
                  }`}
                >
                  <div className="pointer-events-none absolute inset-0 opacity-70">
                    {Array.from({ length: openedReward.rarity === "legendary" ? 26 : openedReward.rarity === "epic" ? 20 : 14 }).map((_, i) => (
                      <span
                        key={i}
                        className={`absolute rounded-full ${rarityCasinoClasses(openedReward.rarity).particles} ${openedReward.rarity === "legendary" ? "h-2 w-2" : "h-1.5 w-1.5"}`}
                        style={{
                          left: `${(i * 37) % 100}%`,
                          top: `${(i * 53) % 100}%`,
                        }}
                      />
                    ))}
                  </div>

                  <motion.div
                    className={`pointer-events-none absolute left-1/2 top-8 h-52 w-52 -translate-x-1/2 rounded-full bg-gradient-radial ${rarityCasinoClasses(openedReward.rarity).orb} blur-3xl`}
                    animate={{ scale: [1, 1.18, 1], opacity: [0.55, 0.9, 0.55] }}
                    transition={{ duration: openedReward.rarity === "legendary" ? 1.45 : 2.4, repeat: Infinity }}
                  />

                  {openedReward.rarity === "legendary" && (
                    <>
                      <motion.div
                        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200 to-transparent shadow-[0_0_45px_rgba(251,191,36,0.85)]"
                        animate={{ opacity: [0.35, 1, 0.35] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                      <motion.div
                        className="pointer-events-none absolute right-5 top-5 text-3xl text-amber-200"
                        animate={{ rotate: [0, 20, -20, 0], scale: [1, 1.25, 1] }}
                        transition={{ duration: 1.1, repeat: Infinity }}
                      >
                        ✦
                      </motion.div>
                      <motion.div
                        className="pointer-events-none absolute bottom-5 left-5 text-3xl text-amber-200"
                        animate={{ rotate: [0, -20, 20, 0], scale: [1, 1.25, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      >
                        ✦
                      </motion.div>
                    </>
                  )}

                  <div className="relative z-10">
                    <motion.div
                      animate={{ y: [0, -6, 0], rotate: openedReward.rarity === "legendary" ? [0, -4, 4, 0] : [0, 0, 0] }}
                      transition={{ duration: openedReward.rarity === "legendary" ? 1.5 : 2.2, repeat: Infinity, ease: "easeInOut" }}
                      className={`mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border bg-black/24 text-white backdrop-blur sm:h-20 sm:w-20 sm:rounded-[26px] ${rarityCasinoClasses(openedReward.rarity).ring}`}
                    >
                      {openedReward.rarity === "legendary" ? (
                        <Crown className="h-9 w-9 text-amber-200 sm:h-11 sm:w-11" />
                      ) : openedReward.rarity === "epic" ? (
                        <Stars className="h-9 w-9 text-fuchsia-200 sm:h-11 sm:w-11" />
                      ) : openedReward.rarity === "rare" ? (
                        <Zap className="h-9 w-9 text-cyan-200 sm:h-11 sm:w-11" />
                      ) : (
                        <Gift className="h-9 w-9 text-white sm:h-11 sm:w-11" />
                      )}
                    </motion.div>

                    <div className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] sm:mt-4 sm:text-[11px] ${rarityCasinoClasses(openedReward.rarity).ring} ${rarityCasinoClasses(openedReward.rarity).text}`}>
                      {rarityIcon(openedReward.rarity)}
                      {rarityLabel(openedReward.rarity)} DROP
                    </div>

                    <h3 className={`mx-auto mt-4 max-w-[92vw] text-3xl font-black uppercase leading-[0.95] tracking-[-0.05em] text-white drop-shadow-[0_10px_28px_rgba(0,0,0,0.45)] sm:mt-5 sm:text-5xl ${openedReward.rarity === "legendary" ? "animate-pulse" : ""}`}>
                      {openedReward.name}
                    </h3>

                    <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-relaxed text-white/72 sm:text-base">
                      {openedReward.description}
                    </p>

                    <div className="mt-4 flex items-center justify-center gap-2 text-fuchsia-200 sm:mt-5">
                      <PartyPopper className="h-4 w-4" />
                      <span className="text-sm font-black uppercase tracking-[0.12em]">
                        Premio desbloqueado
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-2 sm:mt-6 sm:grid-cols-2 sm:gap-3">
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          router.push("/dashboard/puntos/movimientos");
                        }}
                        className={`relative z-50 inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black uppercase tracking-[0.04em] transition ${rarityCasinoClasses(openedReward.rarity).button}`}
                      >
                        <Sparkles className="h-4 w-4" />
                        IR A MIS QR
                      </button>

                      <button
                        type="button"
                        onClick={() => setOpenedReward(null)}
                        className="relative z-40 inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/8 px-6 py-3 text-sm font-black uppercase tracking-[0.04em] text-white transition hover:bg-white/12"
                      >
                        VOLVER A LA BOX
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="mx-auto mt-2 max-w-[360px] text-center sm:mt-3">
              {!canOpen && !isOpening && !loading ? (
                <div className="inline-flex items-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
                  <Lock className="h-4 w-4" />
                  {isGuest
                    ? "Iniciá sesión para usar la Mystery Box"
                    : "No tenés créditos suficientes"}
                </div>
              ) : null}
            </div>

            <div className="mt-3 flex flex-col items-center justify-center gap-2 sm:mt-6 sm:gap-3">
              <button
                onClick={handleOpenBox}
                disabled={!canOpen}
                className={`inline-flex w-full max-w-[320px] items-center justify-center gap-2 rounded-[20px] px-7 py-3.5 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35 disabled:shadow-none sm:min-w-[240px] sm:py-4 sm:text-base ${
                  hasFreeBox
                    ? "bg-amber-400 text-black shadow-[0_0_34px_rgba(251,191,36,0.35)] hover:bg-amber-300"
                    : "bg-fuchsia-600 shadow-[0_0_28px_rgba(217,70,239,0.35)] hover:bg-fuchsia-500"
                }`}
              >
                {isGuest ? (
                  <>
                    <Lock className="h-5 w-5" />
                    INICIÁ SESIÓN
                  </>
                ) : isOpening ? (
                  <>
                    <Gift className="h-5 w-5 animate-pulse" />
                    Abriendo caja...
                  </>
                ) : hasFreeBox ? (
                  <>
                    🎰 ABRIR GRATIS ({freeBoxes})
                  </>
                ) : (
                  <>
                    <Gift className="h-5 w-5" />
                    ABRIR CAJA
                  </>
                )}
              </button>

              <div className="inline-flex items-center gap-2 text-xs text-white/55 sm:text-sm">
                <Coins className="h-4 w-4" />
                {hasFreeBox ? (
                  <span className="font-bold text-amber-300">
                    Tenés {freeBoxes} Mystery Box gratis
                  </span>
                ) : (
                  <>Costo: {BOX_COST.toLocaleString("es-AR")} créditos</>
                )}
              </div>
            </div>

            <div className="relative mx-auto mt-5 w-full max-w-[620px] overflow-hidden sm:mt-7">
              <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-10 bg-gradient-to-r from-[#120618] to-transparent" />
              <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-10 bg-gradient-to-l from-[#120618] to-transparent" />

              <div className="mb-3 flex items-center justify-center gap-2 text-center">
                <Sparkles className="h-3.5 w-3.5 text-fuchsia-300" />
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">
                  Posibles premios
                </p>
                <Sparkles className="h-3.5 w-3.5 text-fuchsia-300" />
              </div>

              <div
                ref={prizesScrollRef}
                className="flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {[...rewards, ...rewards].map((reward, index) => {
                  const casino = rarityCasinoClasses(reward.rarity);

                  return (
                    <div
                      key={`${reward.id}-${index}`}
                      className={`relative min-w-[128px] shrink-0 overflow-hidden rounded-2xl border px-3 py-3 text-center backdrop-blur-xl ${casino.frame}`}
                    >
                      <div className={`pointer-events-none absolute left-1/2 top-0 h-14 w-20 -translate-x-1/2 rounded-full bg-gradient-radial ${casino.orb} blur-2xl`} />

                      <div className="relative z-10 flex flex-col items-center justify-center gap-1">
                        <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${casino.ring} ${casino.text}`}>
                          {rarityIcon(reward.rarity)}
                          {rarityLabel(reward.rarity)}
                        </div>

                        <p className="mt-1 max-w-[105px] truncate text-xs font-black uppercase leading-tight text-white">
                          {reward.name}
                        </p>

                        <p className="text-[10px] font-bold text-white/45">
                          {reward.chance}% chance
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <aside className="hidden space-y-6 2xl:block">
          <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] p-5 shadow-[0_14px_40px_rgba(0,0,0,0.24)] backdrop-blur-xl">
            <h3 className="text-lg font-black text-white">Rarezas</h3>

            <div className="mt-4 space-y-3">
              {(["common", "rare", "epic", "legendary"] as Rarity[]).map((rarity) => (
                <div
                  key={rarity}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${rarityClasses(rarity).badge}`}
                >
                  <div className="flex items-center gap-2 text-sm font-bold">
                    {rarityIcon(rarity)}
                    {rarityLabel(rarity)}
                  </div>

                  <span className="text-sm text-white/80">
                    {rewards.filter((item) => item.rarity === rarity).length} premios
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] p-5 shadow-[0_14px_40px_rgba(0,0,0,0.24)] backdrop-blur-xl">
            <h3 className="text-lg font-black text-white">Posibles premios</h3>

            <div className="mt-4 space-y-3">
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white">{reward.name}</p>
                      <p className="mt-1 text-xs leading-relaxed text-white/55">
                        {reward.description}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${rarityClasses(reward.rarity).badge}`}
                    >
                      {rarityLabel(reward.rarity)}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-white/45">
                    <span>Probabilidad</span>
                    <span>{reward.chance}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] p-5 shadow-[0_14px_40px_rgba(0,0,0,0.24)] backdrop-blur-xl">
            <h3 className="text-lg font-black text-white">Últimas aperturas</h3>

            {history.length === 0 ? (
              <p className="mt-4 text-sm text-white/50">
                Todavía no abriste ninguna caja.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {history.map((item, index) => (
                  <div
                    key={`${item.id}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white">{item.name}</p>
                      <p className="text-xs text-white/45">{item.description}</p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${rarityClasses(item.rarity).badge}`}
                    >
                      {rarityLabel(item.rarity)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}