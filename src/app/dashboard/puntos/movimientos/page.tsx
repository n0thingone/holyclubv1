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
  status: "pending" | "redeemed" | "expired";
  expires_at: string | null;
  redeemed_at: string | null;
  created_at: string;
};

type Reward = {
  id: string;
  name: string;
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

type ActiveTab = "qr" | "movimientos";

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
  const [rewardNames, setRewardNames] = useState<Record<string, string>>({});
  const [selectedQR, setSelectedQR] = useState<Redemption | null>(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("qr");

  const userId = (profile as any)?.id;

  useEffect(() => {
    setIsGuest(getIsGuest());
  }, []);

  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab === "movimientos") {
      setActiveTab("movimientos");
    } else {
      setActiveTab("qr");
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

      const [{ data: movs }, { data: reds }, { data: rewards }] =
        await Promise.all([
          supabase
            .from("holy_points_movements")
            .select("id, amount, type, description, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(30),

          supabase
            .from("holy_redemptions")
            .select(
              "id, reward_id, qr_token, short_token, status, expires_at, redeemed_at, created_at"
            )
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(30),

          supabase.from("holy_rewards").select("id,name"),
        ]);

      setMovements(movs ?? []);
      setRedemptions(reds ?? []);

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
    return rewardNames[redemption.reward_id] ?? "PREMIO";
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

  function getState(r: Redemption) {
    if (r.status === "redeemed") {
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
        key: "pending" as const,
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

      if (r.status === "redeemed" && r.redeemed_at) {
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
        (r.status === "expired" ||
          new Date(r.expires_at).getTime() <= now)
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

  return (
    <DashboardShell title="MOVIMIENTOS">
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
              Iniciá sesión para ver tus QR, tus canjes y tu historial de
              movimientos.
            </p>
          </div>
        )}

        {!isGuest && (
          <div className="rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.10),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-4 backdrop-blur-xl sm:p-5">
            <div className="mb-4">
              <h1 className="text-2xl font-black text-white sm:text-3xl">
                Tus movimientos y premios
              </h1>
              <p className="mt-2 text-sm text-white/60">
                Acá ves tus QR activos, tus canjes y toda tu actividad.
              </p>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab("qr")}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black transition ${
                  activeTab === "qr"
                    ? "bg-fuchsia-500/15 text-fuchsia-200 shadow-[0_0_24px_rgba(217,70,239,0.16)]"
                    : "bg-white/5 text-white/55 hover:bg-white/10 hover:text-white"
                }`}
              >
                <QrCodeIcon className="h-4 w-4" />
                MIS QR
              </button>

              <button
                onClick={() => setActiveTab("movimientos")}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black transition ${
                  activeTab === "movimientos"
                    ? "bg-fuchsia-500/15 text-fuchsia-200 shadow-[0_0_24px_rgba(217,70,239,0.16)]"
                    : "bg-white/5 text-white/55 hover:bg-white/10 hover:text-white"
                }`}
              >
                <History className="h-4 w-4" />
                MIS ULT MOV
              </button>
            </div>

            {activeTab === "qr" ? (
              <div className="space-y-3">
                {loading && redemptions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-white/50">
                    Cargando QR...
                  </div>
                ) : redemptions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-white/50">
                    Todavía no tenés premios o QR generados.
                  </div>
                ) : (
                  redemptions.map((r) => {
                    const state = getState(r);

                    const countdown =
                      state.key === "pending" && r.expires_at
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
                              ) : state.key === "pending" ? (
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
                              {state.key === "pending" ? (
                                <button
                                  onClick={() => setSelectedQR(r)}
                                  className="rounded-2xl bg-[linear-gradient(135deg,#d946ef,#a21caf)] px-4 py-2.5 text-xs font-black text-white shadow-[0_0_26px_rgba(217,70,239,0.22)] transition hover:scale-[1.02] active:scale-[0.98]"
                                >
                                  VER QR
                                </button>
                              ) : null}
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