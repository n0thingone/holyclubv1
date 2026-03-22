"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Gift,
  CheckCircle2,
  AlertCircle,
  X,
  Clock3,
} from "lucide-react";

import QRCode from "react-qr-code";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

type Reward = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  points_cost: number;
  active: boolean;
  stock: number | null;
  sort_order: number | null;
};

type EventRow = {
  id: string;
  name: string;
};

type RedemptionPopup = {
  id: string;
  rewardName: string;
  qrToken: string;
  expiresAt: string;
};

function buildQrToken() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";

  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60000);
}

function formatCountdown(ms: number) {
  if (ms <= 0) return "00:00";

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const sec = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function PuntosCanjeaPage() {

  const supabase = getSupabaseClient();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [activeEvent, setActiveEvent] = useState<EventRow | null>(null);
  const [busyRewardId, setBusyRewardId] = useState<string | null>(null);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [popup, setPopup] = useState<RedemptionPopup | null>(null);
  const [now, setNow] = useState(Date.now());

  const balance =
    typeof (profile as any)?.holy_points_balance === "number"
      ? (profile as any).holy_points_balance
      : 0;

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {

    setLoading(true);

    const [
      { data: rewardsData },
      { data: eventData },
    ] = await Promise.all([
      supabase
        .from("holy_rewards")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true }),

      supabase
        .from("events")
        .select("id,name")
        .eq("status", "active")
        .maybeSingle(),
    ]);

    setRewards(rewardsData ?? []);
    setActiveEvent(eventData ?? null);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const popupCountdown = useMemo(() => {

    if (!popup) return "00:00";

    const expires = new Date(popup.expiresAt).getTime();

    return formatCountdown(expires - now);

  }, [popup, now]);

  async function handleRedeem(reward: Reward) {

    if (!profile?.id) return;

    setError(null);
    setMessage(null);

    if (!activeEvent) {
      setError("No hay evento activo.");
      return;
    }

    if (balance < reward.points_cost) {
      setError("No tienes suficientes créditos.");
      return;
    }

    setBusyRewardId(reward.id);

    try {

      const qrToken = buildQrToken();
      const expiresAt = addMinutes(new Date(), 10).toISOString();

      const { data, error } = await supabase
        .from("redemptions")
        .insert({
          user_id: profile.id,
          reward_id: reward.id,
          points_cost: reward.points_cost,
          status: "pending",
          qr_token: qrToken,
          expires_at: expiresAt,
          source: "rewards",
        })
        .select("id")
        .single();

      if (error || !data?.id) {

        console.error(error);
        setError("No se pudo generar el QR.");

        return;
      }

      setPopup({
        id: data.id,
        rewardName: reward.name,
        qrToken,
        expiresAt,
      });

      setMessage("QR generado correctamente.");

    } catch (err) {

      console.error(err);
      setError("Error generando el canje.");

    } finally {

      setBusyRewardId(null);

    }

  }

  return (

    <div className="mx-auto max-w-5xl px-4 pb-24 space-y-6">

      <div className="text-center">

        <h1 className="text-3xl font-black text-white">
          CANJEAR CRÉDITOS
        </h1>

        <p className="text-white/60 text-sm mt-1">
          Usá tus créditos HOLY para premios.
        </p>

      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {message && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          {message}
        </div>
      )}

      {loading ? (
        <div className="text-white/50 text-sm">
          Cargando premios...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {rewards.map((reward) => {

            const insufficient = balance < reward.points_cost;
            const busy = busyRewardId === reward.id;

            return (
              <div
                key={reward.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3"
              >

                <div className="flex items-center gap-2 text-white font-semibold">
                  <Gift className="w-4 h-4" />
                  {reward.name}
                </div>

                <div className="text-white/50 text-sm">
                  {reward.description}
                </div>

                <div className="text-fuchsia-400 font-bold">
                  {reward.points_cost} créditos
                </div>

                <button
                  onClick={() => handleRedeem(reward)}
                  disabled={insufficient || busy}
                  className="w-full rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white py-2 text-sm font-semibold"
                >
                  {busy ? "Generando..." : "Canjear"}
                </button>

              </div>
            );

          })}

        </div>
      )}

      {popup && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">

          <div className="w-[340px] rounded-3xl border border-fuchsia-500/30 bg-black p-6 text-center shadow-[0_0_40px_rgba(217,70,239,0.35)]">

            <h2 className="text-xl font-black text-white mb-1">
              {popup.rewardName}
            </h2>

            <p className="text-xs text-white/50 mb-4">
              Mostrá este QR en barra
            </p>

            <div className="flex justify-center mb-4">
              <div className="bg-white p-4 rounded-2xl">
                <QRCode value={popup.qrToken} size={190} />
              </div>
            </div>

            <div className="text-white font-mono tracking-widest text-sm mb-3">
              {popup.qrToken}
            </div>

            <div className="flex items-center justify-center gap-2 text-amber-400 text-sm mb-4">
              <Clock3 className="w-4 h-4"/>
              {popupCountdown}
            </div>

            <button
              onClick={() => setPopup(null)}
              className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-4 py-2 rounded-xl text-sm font-semibold"
            >
              Cerrar
            </button>

          </div>

        </div>

      )}

    </div>

  );
}