// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  HelpCircle,
  Lock,
  Gift,
  Gem,
  Crown,
  Beer,
  Wine,
} from "lucide-react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";

const supabase = getSupabaseClient();

const CLAIMABLE_REWARDS = [
  "free_box",
  "free_box_credits_500",
  "credits_2500",
  "credits_10000",
  "credits_25000",
  "shot",
  "beer",
  "champagne_delice",
];

const BAR_REWARDS = ["shot", "beer", "champagne_delice"];

const BAR_REWARD_NAMES: Record<string, string> = {
  shot: "SHOT GRATIS",
  beer: "PINTA",
  champagne_delice: "CHANDON",
};

const LEVELS = [
  { level: 1, xp: 0, title: "Visitante" },
  { level: 2, xp: 200, title: "Habitual" },
  { level: 3, xp: 500, title: "Fiel HOLY" },
  { level: 4, xp: 900, title: "Nocturno" },
  { level: 5, xp: 1400, title: "Elite HOLY" },
  { level: 6, xp: 2000, title: "Leyenda HOLY" },
  { level: 7, xp: 2700, title: "Mítico" },
  { level: 8, xp: 3500, title: "Inmortal HOLY" },
];

const REWARDS = [
  {
    level: 1,
    title: "INICIO",
    description: "Tu primera cajita HOLY",
    reward: "free_box",
    rarity: "rare",
    Icon: Gift,
  },
  {
    level: 2,
    title: "CAJA + 500 CRÉDITOS",
    description: "1 Mystery Box + 500 créditos",
    reward: "free_box_credits_500",
    rarity: "rare",
    Icon: Gift,
  },
  {
    level: 3,
    title: "+2500 CRÉDITOS",
    description: "Créditos para seguir disfrutando",
    reward: "credits_2500",
    rarity: "rare",
    Icon: Gem,
  },
  {
    level: 4,
    title: "SHOT GRATIS",
    description: "Un shot de la casa esperándote",
    reward: "shot",
    rarity: "epic",
    Icon: Wine,
  },
  {
    level: 5,
    title: "PINTA GRATIS",
    description: "Una pinta para disfrutar en HOLY",
    reward: "beer",
    rarity: "epic",
    Icon: Beer,
  },
  {
    level: 6,
    title: "+10.000 CRÉDITOS",
    description: "Premio grande de créditos HOLY",
    reward: "credits_10000",
    rarity: "legendary",
    Icon: Gem,
  },
  {
    level: 7,
    title: "CHAMPAGNE DELICE",
    description: "Premio legendario para canjear en barra",
    reward: "champagne_delice",
    rarity: "legendary",
    Icon: Crown,
  },
  {
    level: 8,
    title: "+25.000 CRÉDITOS",
    description: "Premio máximo del pase HOLY",
    reward: "credits_25000",
    rarity: "legendary",
    Icon: Gem,
  },
];

export default function HolyProgressPage() {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<any>(null);
  const [claimed, setClaimed] = useState<number[]>([]);
  const [claiming, setClaiming] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: progressData } = await supabase
      .from("holy_user_progress")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!progressData) {
      await supabase.from("holy_user_progress").insert({
        user_id: user.id,
        xp: 0,
        level: 1,
        free_boxes: 0,
      });
    }

    const { data: finalProgress } = await supabase
      .from("holy_user_progress")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: claimsData } = await supabase
      .from("holy_claimed_rewards")
      .select("reward_level")
      .eq("user_id", user.id);

    setProgress(finalProgress || { xp: 0, level: 1, free_boxes: 0 });
    setClaimed(claimsData?.map((x: any) => x.reward_level) || []);

    setLoading(false);
  }

  const currentLevel = Math.min(progress?.level || 1, LEVELS.length);
  const currentXP = progress?.xp || 0;
  const isMaxLevel = currentLevel >= LEVELS.length;

  const currentLevelData = useMemo(() => {
    return LEVELS.find((x) => x.level === currentLevel) || LEVELS[0];
  }, [currentLevel]);

  const nextLevelData = useMemo(() => {
    return (
      LEVELS.find((x) => x.level === currentLevel + 1) ||
      LEVELS[LEVELS.length - 1]
    );
  }, [currentLevel]);

  const progressPercent = useMemo(() => {
    if (isMaxLevel) return 100;

    const startXP = currentLevelData.xp;
    const endXP = nextLevelData.xp;
    const total = endXP - startXP;
    const current = currentXP - startXP;

    return Math.max(0, Math.min((current / total) * 100, 100));
  }, [currentXP, currentLevelData, nextLevelData, isMaxLevel]);

  const xpMissing = isMaxLevel
    ? 0
    : Math.max(0, nextLevelData.xp - currentXP);

  async function rollbackClaim(userId: string, level: number) {
    await supabase
      .from("holy_claimed_rewards")
      .delete()
      .eq("user_id", userId)
      .eq("reward_level", level);
  }

  async function createBenefitRedemption(rewardName: string, userId: string) {
    const rewardDbName = BAR_REWARD_NAMES[rewardName];

    if (!rewardDbName) {
      return {
        ok: false,
        message: "Premio no válido.",
      };
    }

    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("id, name, event_date, is_active")
      .eq("is_active", true)
      .order("event_date", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (eventError) {
      console.error(eventError);
      return {
        ok: false,
        message: "Error buscando evento activo.",
      };
    }

    if (!eventData) {
      return {
        ok: false,
        message: "No hay evento activo para generar el QR.",
      };
    }

   const { data: rewardRows, error: rewardError } = await supabase
  .from("holy_rewards")
  .select("id, name, active, points_cost")
  .ilike("name", rewardDbName)
  .order("active", { ascending: false })
  .order("points_cost", { ascending: true })
  .limit(1);

const rewardRow = rewardRows?.[0] || null;

    if (rewardError) {
      console.error(rewardError);
      return {
        ok: false,
        message: "Error buscando el premio en holy_rewards.",
      };
    }

    if (!rewardRow) {
      return {
        ok: false,
        message: `No existe el premio "${rewardDbName}" en holy_rewards.`,
      };
    }

 const { data: redemptionData, error: redemptionError } = await supabase.rpc(
  "create_reward_redemption",
  {
    p_user_id: userId,
    p_reward_id: rewardRow.id,
    p_event_id: eventData.id,
    p_points_cost: 1,
  }
);

console.log("create_reward_redemption result:", redemptionData);

if (redemptionError) {
  console.error(redemptionError);
  return {
    ok: false,
    message: "Error generando el QR en Mis Canjes.",
  };
}

if (!redemptionData?.ok) {
  console.error("RPC devolvió ok false:", redemptionData);
  return {
    ok: false,
    message:
      redemptionData?.message ||
      redemptionData?.status ||
      "La función no generó el QR.",
  };
}


const { data: latestReward } = await supabase
  .from("holy_redemptions")
  .select("id")
  .eq("user_id", userId)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

if (latestReward?.id) {
  await supabase
    .from("holy_redemptions")
    .update({
      expires_at: null,
    })
    .eq("id", latestReward.id);
}

return {
  ok: true,
  message: "QR generado correctamente.",
};
  }

  async function claimReward(level: number, reward: string) {
    if (claiming) return;

    if (!CLAIMABLE_REWARDS.includes(reward)) {
      alert("Este premio todavía no está conectado al sistema.");
      return;
    }

    if (claimed.includes(level)) {
      alert("Este premio ya fue reclamado.");
      return;
    }

    setClaiming(level);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setClaiming(null);
      return;
    }

    const { error: claimError } = await supabase
      .from("holy_claimed_rewards")
      .insert({
        user_id: user.id,
        reward_level: level,
      });

    if (claimError) {
      console.error(claimError);
      alert("No se pudo reclamar el premio.");
      setClaiming(null);
      return;
    }

    let rewardApplied = true;
    let rewardErrorMessage = "";

    if (reward === "free_box") {
      const { error } = await supabase
        .from("holy_user_progress")
        .update({
          free_boxes: (progress?.free_boxes || 0) + 1,
        })
        .eq("user_id", user.id);

      if (error) {
        console.error(error);
        rewardApplied = false;
        rewardErrorMessage = "No se pudo agregar la Mystery Box gratis.";
      }
    }

    if (reward === "free_box_credits_500") {
      const { error: boxError } = await supabase
        .from("holy_user_progress")
        .update({
          free_boxes: (progress?.free_boxes || 0) + 1,
        })
        .eq("user_id", user.id);

      if (boxError) {
        console.error(boxError);
        rewardApplied = false;
        rewardErrorMessage = "No se pudo agregar la Mystery Box gratis.";
      }

      if (rewardApplied) {
        const { error: pointsError } = await supabase.rpc("adjust_holy_points", {
          p_user_id: user.id,
          p_amount: 500,
          p_reason: "progress_reward",
        });

        if (pointsError) {
          console.error(pointsError);
          rewardApplied = false;
          rewardErrorMessage = "No se pudieron agregar los créditos.";
        }
      }
    }

    if (reward === "credits_2500") {
      const { error } = await supabase.rpc("adjust_holy_points", {
        p_user_id: user.id,
        p_amount: 2500,
        p_reason: "progress_reward",
      });

      if (error) {
        console.error(error);
        rewardApplied = false;
        rewardErrorMessage = "No se pudieron agregar los créditos.";
      }
    }

    if (reward === "credits_10000") {
      const { error } = await supabase.rpc("adjust_holy_points", {
        p_user_id: user.id,
        p_amount: 10000,
        p_reason: "progress_reward",
      });

      if (error) {
        console.error(error);
        rewardApplied = false;
        rewardErrorMessage = "No se pudieron agregar los créditos.";
      }
    }

    if (reward === "credits_25000") {
      const { error } = await supabase.rpc("adjust_holy_points", {
        p_user_id: user.id,
        p_amount: 25000,
        p_reason: "progress_reward",
      });

      if (error) {
        console.error(error);
        rewardApplied = false;
        rewardErrorMessage = "No se pudieron agregar los créditos.";
      }
    }

    if (BAR_REWARDS.includes(reward)) {
      const result = await createBenefitRedemption(reward, user.id);

      if (!result.ok) {
        rewardApplied = false;
        rewardErrorMessage = result.message;
      }
    }

    if (!rewardApplied) {
      await rollbackClaim(user.id, level);
      alert(rewardErrorMessage || "No se pudo reclamar el premio.");
      setClaiming(null);
      await loadData();
      return;
    }

    const { data: pointsRow } = await supabase
      .from("holy_points")
      .select("points")
      .eq("user_id", user.id)
      .maybeSingle();

    window.dispatchEvent(
      new CustomEvent("holy-credits-updated", {
        detail: {
          points: pointsRow?.points ?? undefined,
        },
      })
    );

    setClaimed((prev) => [...prev, level]);
    setClaiming(null);

    if (BAR_REWARDS.includes(reward)) {
      alert("Premio reclamado. Tu QR ya está disponible en Mis Canjes.");
    } else {
      alert("Premio reclamado correctamente.");
    }

    await loadData();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-pulse text-fuchsia-300 font-black tracking-widest">
          CARGANDO PROGRESO...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-28 overflow-hidden">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.20),transparent_35%),radial-gradient(circle_at_top_right,rgba(250,204,21,0.12),transparent_28%),radial-gradient(circle_at_bottom,rgba(168,85,247,0.18),transparent_38%)]" />

      <div className="relative max-w-[430px] mx-auto px-4 pt-5">
        <div className="flex items-center justify-between mb-5">
          <Link
            href="/dashboard/beneficios"
            className="h-11 w-11 rounded-2xl border border-white/15 bg-white/5 flex items-center justify-center"
          >
            <ChevronLeft size={26} />
          </Link>

          <div className="text-center">
            <h1 className="text-[22px] font-black tracking-[0.15em]">
              LOGROS HOLY
            </h1>

            <div className="text-fuchsia-400 text-sm font-black tracking-[0.25em]">
              PASE HOLY CLUB
            </div>
          </div>

          <button className="h-11 w-11 rounded-2xl border border-white/15 bg-white/5 flex items-center justify-center">
            <HelpCircle size={24} />
          </button>
        </div>

        <div className="rounded-[28px] border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-950/40 via-zinc-950 to-black p-5">
          <div className="grid grid-cols-[110px_1fr] gap-4 items-center">
            <div className="relative">
              <div className="absolute inset-0 blur-2xl bg-fuchsia-500/30 rounded-full" />

              <div className="relative h-[106px] w-[106px] rounded-[30px] border-2 border-yellow-400/70 bg-gradient-to-br from-purple-900 to-black flex flex-col items-center justify-center">
                <Crown className="text-yellow-300 mb-1" size={26} />

                <span className="text-xs text-fuchsia-200 font-black">
                  NIVEL
                </span>

                <span className="text-5xl font-black leading-none">
                  {currentLevel}
                </span>
              </div>
            </div>

            <div>
              <p className="text-fuchsia-400 text-xs font-black tracking-widest">
                TU PROGRESO
              </p>

              <div className="mt-1 text-[22px] font-black">
                {currentXP.toLocaleString("es-AR")}{" "}
                <span className="text-fuchsia-400">
                  /{" "}
                  {isMaxLevel
                    ? "MAX"
                    : `${nextLevelData.xp.toLocaleString("es-AR")} XP`}
                </span>
              </div>

              <div className="mt-3 h-4 rounded-full bg-black/60 border border-fuchsia-400/30 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-pink-400 to-fuchsia-300"
                  style={{
                    width: `${progressPercent}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-xs text-zinc-400 font-bold">
                {isMaxLevel
                  ? "NIVEL MÁXIMO ALCANZADO"
                  : `FALTAN ${xpMissing} XP PARA NIVEL ${currentLevel + 1}`}
              </p>
            </div>
          </div>
        </div>

        <h2 className="mt-7 mb-4 text-fuchsia-400 text-lg font-black tracking-wide">
          CAMINO DE LOGROS
        </h2>

        <div className="relative pl-[54px] space-y-3">
          <div className="absolute left-[23px] top-8 bottom-8 w-[3px] rounded-full bg-gradient-to-b from-yellow-400 via-cyan-400 to-fuchsia-500" />

          {REWARDS.map((reward) => {
            const unlocked = currentLevel >= reward.level;
            const alreadyClaimed = claimed.includes(reward.level);
            const locked = !unlocked;
            const canClaim = unlocked && !alreadyClaimed;

            const missingXP = Math.max(
              0,
              (LEVELS.find((l) => l.level === reward.level)?.xp || 0) -
                currentXP
            );

            return (
              <div key={reward.level} className="relative">
                <div
                  className={[
                    "absolute -left-[54px] top-1/2 -translate-y-1/2 h-12 w-12 rounded-2xl rotate-45 border-2 flex items-center justify-center z-10 transition-all",
                    alreadyClaimed
                      ? "border-zinc-700 bg-black opacity-60"
                      : reward.level <= currentLevel
                      ? "border-yellow-400 bg-black"
                      : "border-fuchsia-500/80 bg-black",
                  ].join(" ")}
                >
                  <span className="-rotate-45 text-white font-black text-sm">
                    {reward.level}
                  </span>
                </div>

                <div
                  className={[
                    "min-h-[96px] rounded-[24px] border p-3 flex items-center gap-3 transition-all",
                    alreadyClaimed
                      ? "border-white/10 bg-zinc-950/40 opacity-45 grayscale pointer-events-none"
                      : locked
                      ? "border-white/10 bg-zinc-950/70 opacity-50"
                      : canClaim
                      ? "border-yellow-400/40 bg-gradient-to-r from-zinc-950 via-zinc-950 to-fuchsia-950/20"
                      : "border-white/15 bg-gradient-to-r from-zinc-950 via-zinc-950 to-fuchsia-950/20",
                  ].join(" ")}
                >
                  <div className="relative shrink-0 h-16 w-16 rounded-2xl bg-black/40 flex items-center justify-center">
                    <reward.Icon
                      size={42}
                      className={[
                        "relative",
                        alreadyClaimed
                          ? "text-zinc-500"
                          : reward.rarity === "legendary"
                          ? "text-yellow-300"
                          : reward.rarity === "epic"
                          ? "text-fuchsia-300"
                          : "text-cyan-300",
                      ].join(" ")}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-[17px] leading-tight font-black">
                      {reward.title}
                    </h3>

                    <p className="mt-1 text-[13px] leading-snug text-zinc-300">
                      {reward.description}
                    </p>
                  </div>

                  <div className="shrink-0 w-[94px] flex flex-col items-end">
                    {alreadyClaimed ? (
                      <div className="h-9 px-3 rounded-xl border border-white/10 bg-white/5 text-zinc-500 text-[11px] font-black flex items-center gap-1">
                        <Lock size={13} />
                        RECL.
                      </div>
                    ) : canClaim ? (
                      <button
                        onClick={() =>
                          claimReward(reward.level, reward.reward)
                        }
                        disabled={claiming === reward.level}
                        className="h-10 px-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-400 text-black text-xs font-black active:scale-95 transition-all disabled:opacity-50"
                      >
                        {claiming === reward.level ? "..." : "CANJEAR"}
                      </button>
                    ) : (
                      <>
                        <div className="h-9 px-3 rounded-xl border border-white/15 bg-white/5 text-zinc-400 text-xs font-black flex items-center gap-1">
                          <Lock size={13} />
                          BLOQ.
                        </div>

                        <p className="mt-1 text-[11px] text-fuchsia-400 font-black">
                          {missingXP} XP
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}