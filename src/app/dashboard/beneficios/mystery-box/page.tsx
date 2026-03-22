"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gift,
  Zap,
  Stars,
  Crown,
  Lock,
  Coins,
  PartyPopper,
  AlertCircle,
} from "lucide-react";
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
  balance: number;
};

const BOX_COST = 3000;

const rewards: BoxReward[] = [
  {
    id: "500_credits",
    name: "500 CRÉDITOS",
    rarity: "common",
    chance: 40,
    type: "credits",
    value: 500,
    description: "Volvés a sumar una parte para seguir jugando.",
  },
  {
    id: "1000_credits",
    name: "1000 CRÉDITOS",
    rarity: "rare",
    chance: 25,
    type: "credits",
    value: 1000,
    description: "Buen drop. Te sirve para otro canje o seguir probando.",
  },
  {
    id: "shot",
    name: "SHOT GRATIS",
    rarity: "rare",
    chance: 15,
    type: "reward",
    description: "Canjeable en barra en este evento.",
  },
  {
    id: "pinta",
    name: "PINTA 500CC",
    rarity: "epic",
    chance: 10,
    type: "reward",
    description: "Una pinta bien fría para canjear en barra.",
  },
  {
    id: "vaso_litro",
    name: "VASO DE LITRO",
    rarity: "epic",
    chance: 7,
    type: "reward",
    description: "Vaso plástico de litro estilo boliche.",
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
    id: "10000_credits",
    name: "10.000 CRÉDITOS",
    rarity: "legendary",
    chance: 2,
    type: "credits",
    value: 10000,
    description: "Jackpot de créditos HOLY.",
  },
];

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

export default function MysteryBoxPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { profile, loading } = useAuth();

  const [isOpening, setIsOpening] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [openedReward, setOpenedReward] = useState<BoxReward | null>(null);
  const [history, setHistory] = useState<BoxReward[]>([]);
  const [showJackpot, setShowJackpot] = useState(false);
  const [localBalance, setLocalBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const profileBalance = Number((profile as any)?.holy_points_balance ?? 0);
  const credits = localBalance ?? profileBalance;
  const canOpen = credits >= BOX_COST && !isOpening && !loading;

  const rarityCount = useMemo(() => {
    return {
      common: rewards.filter((r) => r.rarity === "common").length,
      rare: rewards.filter((r) => r.rarity === "rare").length,
      epic: rewards.filter((r) => r.rarity === "epic").length,
      legendary: rewards.filter((r) => r.rarity === "legendary").length,
    };
  }, []);

  async function handleOpenBox() {
    const userId = (profile as any)?.id;
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

      const { data, error } = await supabase.rpc("open_holy_mystery_box", {
        p_user_id: userId,
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

      if (typeof result.balance === "number") {
  setLocalBalance(result.balance);
  window.dispatchEvent(
    new CustomEvent("holy-credits-updated", {
      detail: result.balance,
    })
  );
}

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
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-24 pt-2">
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

      <section className="relative overflow-hidden rounded-[34px] border border-fuchsia-500/20 bg-[radial-gradient(circle_at_top,rgba(217,70,239,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 shadow-[0_0_70px_rgba(168,85,247,0.18)] backdrop-blur-xl sm:p-6">
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
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1.25fr)_420px]">
        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] p-5 shadow-[0_16px_44px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:p-6">
          <div className="pointer-events-none absolute inset-0 opacity-50">
            <div className="absolute left-1/2 top-8 h-40 w-40 -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-3xl" />
            <div className="absolute bottom-10 left-1/2 h-32 w-56 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
          </div>

          <div className="relative">
            <div className="text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-fuchsia-300">
                Box opening
              </p>
              <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                HOLY BOX
              </h2>
              <p className="mt-2 text-sm text-white/55">
                Abrila y descubrí qué te tocó esta noche.
              </p>
            </div>

            <div className="relative mx-auto mt-8 flex min-h-[400px] w-full max-w-[560px] items-center justify-center sm:min-h-[420px]">
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
                  className="relative z-10 w-full max-w-[340px] sm:max-w-[360px]"
                >
                  <div className="absolute inset-x-8 bottom-2 h-10 rounded-full bg-fuchsia-500/25 blur-2xl" />

                  <div className="relative h-[240px] w-full rounded-[28px] border border-fuchsia-400/20 bg-[linear-gradient(180deg,rgba(29,9,50,0.96),rgba(10,10,16,0.98))] shadow-[0_0_80px_rgba(217,70,239,0.18)] sm:h-[250px]">
                    <div className="absolute inset-x-4 top-5 h-8 rounded-2xl border border-white/10 bg-white/5" />
                    <div className="absolute inset-y-0 left-0 w-6 rounded-l-[28px] border-r border-fuchsia-400/20 bg-white/5" />
                    <div className="absolute inset-y-0 right-0 w-6 rounded-r-[28px] border-l border-fuchsia-400/20 bg-white/5" />
                    <div className="absolute inset-x-0 top-[104px] h-[10px] bg-fuchsia-500/70 shadow-[0_0_30px_rgba(217,70,239,0.75)]" />
                    <div className="absolute inset-x-0 top-[118px] h-[3px] bg-cyan-400/90 shadow-[0_0_26px_rgba(34,211,238,0.8)]" />

                    <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[24px] border border-fuchsia-400/25 bg-black/30 shadow-[0_0_40px_rgba(217,70,239,0.22)]">
                      <span className="text-4xl font-black text-fuchsia-300">?</span>
                    </div>

                    <div className="absolute left-1/2 top-[62px] -translate-x-1/2 text-center">
                      <p className="text-sm font-black uppercase tracking-[0.3em] text-white">
                        HOLY
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.7, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className={`relative z-10 w-full max-w-[560px] rounded-[32px] border p-5 text-center sm:p-6 ${
                    rarityClasses(openedReward.rarity).badge
                  } ${rarityClasses(openedReward.rarity).glow}`}
                >
                  <div className="absolute inset-x-10 bottom-2 h-10 rounded-full bg-fuchsia-500/15 blur-2xl" />

                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/10 bg-black/20 text-white">
                    {openedReward.rarity === "legendary" ? (
                      <Crown className="h-10 w-10 text-amber-300" />
                    ) : openedReward.rarity === "epic" ? (
                      <Stars className="h-10 w-10 text-fuchsia-300" />
                    ) : openedReward.rarity === "rare" ? (
                      <Zap className="h-10 w-10 text-cyan-300" />
                    ) : (
                      <Gift className="h-10 w-10 text-white" />
                    )}
                  </div>

                  <div className="mt-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]">
                    {rarityIcon(openedReward.rarity)}
                    {rarityLabel(openedReward.rarity)}
                  </div>

                  <h3 className="mt-5 text-2xl font-black tracking-tight text-white sm:text-4xl">
                    {openedReward.name}
                  </h3>

                  <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/70">
                    {openedReward.description}
                  </p>

                  <div className="mt-6 flex items-center justify-center gap-2 text-fuchsia-300">
                    <PartyPopper className="h-4 w-4" />
                    <span className="text-sm font-semibold">
                      Premio desbloqueado
                    </span>
                  </div>

                  <button
                    onClick={() => setOpenedReward(null)}
                    className="mt-6 inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                  >
                    Volver a la caja
                  </button>
                </motion.div>
              )}
            </div>

            <div className="mx-auto mt-3 max-w-[360px] text-center">
              {!canOpen && !isOpening && !loading ? (
                <div className="inline-flex items-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
                  <Lock className="h-4 w-4" />
                  No tenés créditos suficientes
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex flex-col items-center justify-center gap-3">
              <button
                onClick={handleOpenBox}
                disabled={!canOpen}
                className="inline-flex min-w-[240px] items-center justify-center gap-2 rounded-[22px] bg-fuchsia-600 px-8 py-4 text-base font-black text-white shadow-[0_0_28px_rgba(217,70,239,0.35)] transition hover:bg-fuchsia-500 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35 disabled:shadow-none"
              >
                {isOpening ? (
                  <>
                    <Gift className="h-5 w-5 animate-pulse" />
                    Abriendo caja...
                  </>
                ) : (
                  <>
                    <Gift className="h-5 w-5" />
                    ABRIR CAJA
                  </>
                )}
              </button>

              <div className="inline-flex items-center gap-2 text-sm text-white/55">
                <Coins className="h-4 w-4" />
                Costo: {BOX_COST.toLocaleString("es-AR")} créditos
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
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