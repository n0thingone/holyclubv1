"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Crown, ShieldCheck, Ticket, Sparkles } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";

type EntryData = {
  id?: string;
  title?: string | null;
  name?: string | null;
  qr_token?: string | null;
  short_token?: string | null;
  max_uses?: number | null;
  used_count?: number | null;
  is_active?: boolean | null;
};

export default function EntradaTokenPage() {
  const params = useParams();
  const rawToken = Array.isArray(params?.token) ? params.token[0] : params?.token;
  const token = decodeURIComponent(String(rawToken ?? "")).trim();

  const supabase = getSupabaseClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [entry, setEntry] = useState<EntryData | null>(null);
  const [message, setMessage] = useState("");

  const origin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  const qrValue = useMemo(() => {
    if (!token) return "";
    return `${origin}/entrada/${token}`;
  }, [origin, token]);

  const title = entry?.title || entry?.name || "VIP ENTRY";

  const maxUses = Number(entry?.max_uses ?? 1);
  const usedCount = Number(entry?.used_count ?? 0);
  const remaining = Math.max(maxUses - usedCount, 0);
  const isActive = Boolean(entry?.is_active ?? true);
  const isExhausted = usedCount >= maxUses;
  const isValid = !!entry && isActive && !isExhausted;

  useEffect(() => {
    let mounted = true;

    async function loadEntry() {
      if (!token) {
        setError("Token inválido");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setMessage("");

      const normalized = token.trim().toUpperCase();

      const { data, error } = await supabase
        .from("holy_redemptions")
        .select("id,title,name,qr_token,short_token,max_uses,used_count,is_active")
        .or(`qr_token.eq.${normalized},short_token.eq.${normalized}`)
        .limit(1)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        setError("No se pudo cargar el QR");
        setEntry(null);
      } else if (!data) {
        setError("QR no encontrado");
        setEntry(null);
      } else {
        setEntry(data);
      }

      setLoading(false);
    }

    loadEntry();

    return () => {
      mounted = false;
    };
  }, [supabase, token]);

  async function handleValidate() {
    if (!token || submitting) return;

    try {
      setSubmitting(true);
      setMessage("");
      setError("");

     const { data, error } = await (supabase as any).rpc("redeem_reward_qr", {
  p_qr_token: token,
});

      if (error) throw error;

      const ok = Boolean(data?.ok);

      if (!ok) {
        setError(data?.message || "No se pudo validar el ingreso");
        return;
      }

      setMessage(data?.message || "Ingreso validado");
      setEntry((prev) =>
        prev
          ? {
              ...prev,
              used_count: Number(prev.used_count ?? 0) + 1,
            }
          : prev
      );
    } catch (err) {
      console.error(err);
      setError("Error al validar ingreso");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#05010f] text-white flex items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-yellow-400/30 border-t-yellow-300 animate-spin" />
          <p className="text-white/80 text-lg">Cargando acceso GOLD...</p>
        </div>
      </main>
    );
  }

  if (error && !entry) {
    return (
      <main className="min-h-screen bg-[#05010f] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-white/5 p-6 text-center shadow-2xl">
          <h1 className="mb-2 text-3xl font-extrabold">VIP ENTRY</h1>
          <p className="text-red-300 text-lg">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,215,64,0.14),_transparent_35%),linear-gradient(180deg,#05010f_0%,#090018_100%)] text-white px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="relative overflow-hidden rounded-[32px] border border-yellow-400/30 bg-gradient-to-b from-[#1a1202] via-[#120912] to-[#090014] p-5 shadow-[0_0_60px_rgba(255,215,0,0.12)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,220,120,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,200,0,0.08),transparent_30%)]" />

          <div className="relative z-10">
            <div className="mb-4 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-300/30 bg-yellow-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-yellow-200">
                <Crown className="h-4 w-4" />
                Gold Access
              </div>

              <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
                <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
                Holy Club
              </div>
            </div>

            <div className="mb-5">
              <h1 className="text-3xl font-black tracking-tight text-white">
                {title}
              </h1>
              <p className="mt-1 text-sm text-yellow-100/75">VIP ENTRY • QR GOLD</p>
            </div>

            <div className="mb-5 rounded-[28px] border border-yellow-300/25 bg-gradient-to-b from-yellow-300/10 to-white/5 p-4">
              <div className="mx-auto flex w-full max-w-[280px] items-center justify-center rounded-[24px] bg-white p-4 shadow-[0_0_40px_rgba(255,215,0,0.18)]">
                <QRCodeSVG
                  value={qrValue}
                  size={230}
                  bgColor="#ffffff"
                  fgColor="#111111"
                  level="H"
                  includeMargin
                />
              </div>

              <p className="mt-3 break-all text-center text-[11px] text-white/55">
                {token}
              </p>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="mb-1 flex items-center gap-2 text-white/60">
                  <Ticket className="h-4 w-4 text-yellow-300" />
                  <span className="text-xs uppercase tracking-wide">Usos</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {usedCount} / {maxUses}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="mb-1 flex items-center gap-2 text-white/60">
                  <ShieldCheck className="h-4 w-4 text-green-300" />
                  <span className="text-xs uppercase tracking-wide">Estado</span>
                </div>
                <p
                  className={`text-base font-bold ${
                    isValid ? "text-green-300" : "text-red-300"
                  }`}
                >
                  {isValid ? "QR válido" : "No disponible"}
                </p>
              </div>
            </div>

            <div className="mb-4 rounded-2xl border border-yellow-300/20 bg-yellow-300/8 px-4 py-3 text-center">
              <p className="text-sm text-yellow-100/80">Usos restantes</p>
              <p className="text-3xl font-black text-yellow-200">{remaining}</p>
            </div>

            {message ? (
              <div className="mb-4 rounded-2xl border border-green-400/20 bg-green-500/10 px-4 py-3 text-center text-green-300">
                {message}
              </div>
            ) : null}

            {error ? (
              <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-center text-red-300">
                {error}
              </div>
            ) : null}

            <button
              onClick={handleValidate}
              disabled={!isValid || submitting}
              className="w-full rounded-2xl bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 px-5 py-4 text-lg font-extrabold text-black shadow-[0_10px_30px_rgba(255,215,0,0.25)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Validando..." : "Validar ingreso"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}