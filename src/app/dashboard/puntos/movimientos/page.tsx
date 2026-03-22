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
} from "lucide-react";
import QRCode from "react-qr-code";
import DashboardShell from "@/components/navigation/DashboardShell";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

type Movement = {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
};

type Redemption = {
  id: string;
  reward_id: string;
  qr_token: string;
  status: "pending" | "redeemed" | "expired";
  expires_at: string | null;
  redeemed_at: string | null;
  created_at: string;
};

type Reward = {
  id: string;
  name: string;
};

export default function MovimientosPage() {
  const supabase = getSupabaseClient();
  const { profile } = useAuth();

  const [movements, setMovements] = useState<Movement[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [rewardNames, setRewardNames] = useState<Record<string, string>>({});
  const [selectedQR, setSelectedQR] = useState<Redemption | null>(null);
  const [now, setNow] = useState(Date.now());

  const userId = (profile as any)?.id;

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!userId) return;

    loadData();

    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, [userId]);

  async function loadData() {
    const [{ data: movs }, { data: reds }, { data: rewards }] =
      await Promise.all([
        supabase
          .from("point_movements")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(15),

        supabase
          .from("redemptions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),

        supabase.from("holy_rewards").select("id,name"),
      ]);

    setMovements(movs ?? []);
    setRedemptions(reds ?? []);

    const map: Record<string, string> = {};
    (rewards ?? []).forEach((r: Reward) => {
      map[r.id] = r.name;
    });

    setRewardNames(map);
  }

  function getRewardLabel(redemption: Redemption) {
    return rewardNames[redemption.reward_id] ?? redemption.reward_id;
  }

  function formatTime(date: string | null) {
    if (!date) return "";
    return new Date(date).toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString("es-AR");
  }

  function formatCountdown(ms: number) {
    if (ms <= 0) return "00:00";

    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;

    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function getState(redemption: Redemption) {
    if (redemption.status === "redeemed") {
      return {
        key: "redeemed",
        label: "CANJEADO",
        color: "text-emerald-400",
        icon: <CheckCircle2 className="w-3 h-3" />,
      };
    }

    if (
      redemption.status === "expired" ||
      (redemption.expires_at &&
        new Date(redemption.expires_at).getTime() <= Date.now())
    ) {
      return {
        key: "expired",
        label: "EXPIRADO",
        color: "text-red-400",
        icon: <AlertCircle className="w-3 h-3" />,
      };
    }

    return {
      key: "pending",
      label: "PENDIENTE",
      color: "text-yellow-400",
      icon: <Clock3 className="w-3 h-3" />,
    };
  }

  const popupCountdown = useMemo(() => {
    if (!selectedQR?.expires_at) return null;

    const expires = new Date(selectedQR.expires_at).getTime();
    return formatCountdown(expires - now);
  }, [selectedQR, now]);

  return (
    <DashboardShell title="HOLY CLUB · MOVIMIENTOS">
      <div className="mx-auto max-w-6xl px-4 pb-24 space-y-6">

        <div className="rounded-3xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-600/10 to-black p-6">
          <h1 className="text-2xl font-black text-white">
            Tus movimientos y premios
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Acá ves tus créditos y premios para mostrar en barra.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* MIS QR */}

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-4">

            <div className="flex items-center gap-2 text-white/80 font-semibold">
              <QrCodeIcon className="w-4 h-4" />
              MIS QR
            </div>

            {redemptions.map((r) => {

              const state = getState(r)

              const countdown =
                state.key === "pending" && r.expires_at
                  ? formatCountdown(
                      new Date(r.expires_at).getTime() - now
                    )
                  : null

              return (

                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-4"
                >

                  <div>

                    <div className="text-white font-semibold">
                      {getRewardLabel(r)}
                    </div>

                    <div
                      className={`text-xs mt-1 flex items-center gap-1 font-semibold ${state.color}`}
                    >
                      {state.icon}
                      {state.label}
                    </div>

                    {state.key === "pending" && countdown && (

                      <div className="text-xs text-yellow-300 mt-1">
                        vence en {countdown}
                      </div>

                    )}

                    {state.key === "expired" && (

                      <div className="text-xs text-red-300 mt-1">
                        venció {formatTime(r.expires_at)}
                      </div>

                    )}

                    {state.key === "redeemed" && (

                      <div className="text-xs text-emerald-300 mt-1">
                        canjeado a las {formatTime(r.redeemed_at)}
                      </div>

                    )}

                  </div>

                  {state.key === "pending" ? (

                    <button
                      onClick={() => setSelectedQR(r)}
                      className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs px-4 py-2 rounded-xl"
                    >
                      VER QR
                    </button>

                  ) : (

                    <div
                      className={`text-[11px] font-bold px-3 py-2 rounded-xl border ${
                        state.key === "redeemed"
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                          : "border-red-500/20 bg-red-500/10 text-red-300"
                      }`}
                    >
                      {state.key === "redeemed" ? "OK" : "VENCIDO"}
                    </div>

                  )}

                </div>
              )
            })}

          </div>

          {/* MOVIMIENTOS */}

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-4">

            <div className="flex items-center gap-2 text-white/80 font-semibold">
              <History className="w-4 h-4" />
              Últimos movimientos
            </div>

            {movements.map((mov) => {

              const ingreso = mov.amount > 0

              return (

                <div
                  key={mov.id}
                  className="flex items-center justify-between border border-white/10 rounded-xl p-3"
                >

                  <div className="flex items-center gap-2">

                    {ingreso ? (
                      <ArrowDownLeft className="text-green-400 w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="text-red-400 w-4 h-4" />
                    )}

                    <div>

                      <div className="text-white text-sm">
                        {mov.description ?? "Movimiento"}
                      </div>

                      <div className="text-xs text-white/40">
                        {formatDate(mov.created_at)}
                      </div>

                    </div>

                  </div>

                  <div
                    className={`font-bold ${
                      ingreso ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {ingreso ? "+" : ""}
                    {mov.amount}
                  </div>

                </div>

              )
            })}

          </div>

        </div>
      </div>

      {/* QR POPUP */}

      {selectedQR && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">

          <div className="w-[340px] rounded-3xl border border-fuchsia-500/30 bg-black p-6 text-center shadow-[0_0_40px_rgba(217,70,239,0.35)]">

            <h2 className="text-xl font-black text-white mb-1">
              {getRewardLabel(selectedQR)}
            </h2>

            <p className="text-xs text-white/50 mb-4">
              Mostrá este QR en barra
            </p>

            <div className="flex justify-center mb-4">
              <div className="bg-white p-4 rounded-2xl">
                <QRCode value={selectedQR.qr_token} size={190} />
              </div>
            </div>

            <div className="text-white font-mono text-sm mb-3 break-all">
              {selectedQR.qr_token}
            </div>

            {selectedQR.expires_at ? (

              <div className="flex items-center justify-center gap-2 text-amber-400 text-sm mb-4">
                <Clock3 className="w-4 h-4" />
                {popupCountdown}
              </div>

            ) : (

              <div className="text-cyan-300 text-sm mb-4">
                premio sin vencimiento
              </div>

            )}

            <button
              onClick={() => setSelectedQR(null)}
              className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-4 py-2 rounded-xl text-sm font-semibold"
            >
              Cerrar
            </button>

          </div>

        </div>

      )}

    </DashboardShell>
  );
}