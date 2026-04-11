"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useActiveEvent } from "@/hooks/useActiveEvent";
import { useRrppStats } from "@/hooks/useRrppStats";
import {
  Zap,
  Clock,
  Wine,
  GlassWater,
  CheckCircle2,
  QrCode,
  Trophy,
} from "lucide-react";
import type { RrppProfile } from "@/types";

function formatDateTime(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusBadge(status?: string | null) {
  const normalized = String(status || "").toLowerCase();

  if (["redeemed", "used", "claimed"].includes(normalized)) {
    return {
      label: "CANJEADO",
      className: "bg-white/10 text-white/60 border border-white/10",
    };
  }

  if (["expired", "vencido"].includes(normalized)) {
    return {
      label: "VENCIDO",
      className: "bg-red-500/15 text-red-300 border border-red-500/20",
    };
  }

  return {
    label: "DISPONIBLE",
    className:
      "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
  };
}

export default function RrppConsumicionesPage() {
  const [rrpp, setRrpp] = useState<RrppProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingReward, setCreatingReward] = useState(false);

  const { profile: authProfile, loading: authLoading } = useAuth();
  const { event } = useActiveEvent();
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { stats, loading: statsLoading, refetch } = useRrppStats(
    rrpp?.id,
    event?.id
  );

  useEffect(() => {
    if (authLoading) return;

    if (!authProfile) {
      router.push("/login");
      return;
    }

    if (authProfile.role !== "rrpp") {
      router.push("/dashboard");
      return;
    }

    (supabase.from("rrpp_profiles") as any)
      .select("*")
      .eq("profile_id", authProfile.id)
      .single()
      .then(({ data, error }: any) => {
        if (error) {
          console.error("Error cargando rrpp profile:", error);
          setRrpp(null);
          setLoading(false);
          return;
        }

        setRrpp(data ?? null);
        setLoading(false);
      });
  }, [authProfile, authLoading, router, supabase]);

  useEffect(() => {
    if (!rrpp || !event) return;
    if (creatingReward) return;

    const createRewardIfMissing = async () => {
      try {
        setCreatingReward(true);

        const { data: existing, error: existingError } = await supabase
          .from("rrpp_event_rewards")
          .select("id")
          .eq("rrpp_id", rrpp.id)
          .eq("event_id", event.id)
          .limit(1);

        if (existingError) {
          console.error("Error verificando reward:", existingError);
          return;
        }

        if (existing && existing.length > 0) {
          return;
        }

        const qrToken = crypto.randomUUID();

        const { data: inserted, error: insertError } = await supabase
          .from("rrpp_event_rewards")
          .insert({
            rrpp_id: rrpp.id,
            event_id: event.id,
            title: "Consumición FREE",
            status: "unlocked",
            qr_token: qrToken,
            reward_type: "consumicion",
          })
          .select();

        console.log("INSERT RESULT:", inserted);

        if (insertError) {
          console.error("ERROR INSERT CODE:", insertError?.code);
          console.error("ERROR INSERT MESSAGE:", insertError?.message);
          console.error("ERROR INSERT DETAILS:", insertError?.details);
          console.error("ERROR INSERT HINT:", insertError?.hint);
          return;
        }

        await refetch();
      } catch (error) {
        console.error("Error createRewardIfMissing:", error);
      } finally {
        setCreatingReward(false);
      }
    };

    createRewardIfMissing();
  }, [rrpp, event, supabase, refetch, creatingReward]);

  const unlockedRewards = (stats?.rewards ?? []).filter(
    (reward: any) => reward.status === "unlocked" && reward.qr_token
  );

  const availableBenefits = (stats?.benefits ?? []).filter(
    (benefit: any) => benefit.status !== "redeemed"
  );

  const usedBenefits = (stats?.benefits ?? []).filter(
    (benefit: any) => benefit.status === "redeemed"
  );

  if (loading || statsLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <Zap className="w-10 h-10 text-accent-purple animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background mesh-bg">
      <main className="px-4 py-6 space-y-5 max-w-sm mx-auto pb-10">
        <div className="holy-card bg-gradient-card">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-fuchsia-500/15 border border-fuchsia-400/20 flex items-center justify-center">
              <Wine className="w-5 h-5 text-fuchsia-300" />
            </div>
            <div>
              <p className="holy-label mb-0">MIS CONSUMICIONES</p>
              <p className="text-xs text-white/50">
                {event ? event.name : "Sin evento activo"}
              </p>
            </div>
          </div>

          <p className="text-sm text-white/80 leading-relaxed">
            Acá ves tus beneficios y premios del evento actual. Si tenés un QR
            activo, mostralo directamente en barra.
          </p>
        </div>

        {event && unlockedRewards.length > 0 && (
          <div className="space-y-4">
            {unlockedRewards.map((reward: any) => {
              const badge = getStatusBadge(reward.status);
              const expiresAt = formatDateTime(
                reward?.expires_at ?? (event as any)?.ends_at ?? null
              );

              return (
                <div key={reward.id} className="holy-card space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-400/20 flex items-center justify-center">
                        <QrCode className="w-5 h-5 text-emerald-300" />
                      </div>
                      <div>
                        <p className="holy-label mb-0">QR ACTIVO</p>
                        <p className="text-sm text-white/85">{reward.title}</p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div className="bg-white rounded-3xl p-4 flex items-center justify-center">
                    <QRCode
                      value={`HOLY-RRPP:${reward.qr_token}`}
                      size={180}
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />
                  </div>

                  <div className="space-y-1 text-sm text-white/70">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-white/40" />
                      <span>{expiresAt || "Válido en evento actual"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>Mostralo en barra para canjear</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {event && availableBenefits.length > 0 && (
          <div className="space-y-3">
            {availableBenefits.map((benefit: any) => {
              const badge = getStatusBadge(benefit.status);
              const expiresAt = formatDateTime(
                benefit?.expires_at ?? (event as any)?.ends_at ?? null
              );

              return (
                <div
                  key={benefit.id}
                  className="holy-card flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-400/20 flex items-center justify-center">
                      <GlassWater className="w-5 h-5 text-sky-300" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white/90">
                        {benefit.title}
                      </p>
                      <p className="text-xs text-white/55">
                        {expiresAt || "Evento actual"}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {event && usedBenefits.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Trophy className="w-4 h-4 text-white/50" />
              <p className="text-xs uppercase tracking-[0.25em] text-white/40">
                Ya usadas
              </p>
            </div>

            {usedBenefits.map((benefit: any) => {
              const badge = getStatusBadge(benefit.status);
              const expiresAt = formatDateTime(
                benefit?.expires_at ?? (event as any)?.ends_at ?? null
              );

              return (
                <div
                  key={benefit.id}
                  className="holy-card flex items-start justify-between gap-3 opacity-80"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <GlassWater className="w-5 h-5 text-white/40" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white/75">
                        {benefit.title}
                      </p>
                      <p className="text-xs text-white/45">
                        {expiresAt || "Evento actual"}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {event &&
          unlockedRewards.length === 0 &&
          availableBenefits.length === 0 &&
          usedBenefits.length === 0 &&
          !creatingReward && (
            <div className="holy-card text-center py-10">
              <div className="w-14 h-14 mx-auto rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <Wine className="w-7 h-7 text-white/25" />
              </div>
              <p className="text-lg font-semibold text-white/65">
                Todavía no tenés consumiciones
              </p>
              <p className="text-sm text-white/45 mt-2">
                Cuando el evento te habilite beneficios o premios, van a
                aparecer acá.
              </p>
            </div>
          )}

        {!event && (
          <div className="holy-card text-center py-10">
            <div className="w-14 h-14 mx-auto rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <Clock className="w-7 h-7 text-white/25" />
            </div>
            <p className="text-lg font-semibold text-white/65">
              No hay evento activo
            </p>
            <p className="text-sm text-white/45 mt-2">
              Cuando haya un evento activo, tu QR y consumiciones van a aparecer
              automáticamente acá.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}