"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import QRScanner from "@/components/scanner/QRScanner";
import {
  CheckCircle,
  XCircle,
  ScanLine,
  Clock,
  Keyboard,
  ArrowLeft,
} from "lucide-react";

type RedeemResponse = {
  ok: boolean;
  code: string;
  message: string;
  redemption_id?: string;
  reward_id?: string;
  reward_name?: string;
  points_cost?: number;
  user_id?: string;
};

function playBeep(success: boolean) {
  try {
    const AudioCtx =
      window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = success ? 880 : 220;
    gainNode.gain.value = 0.04;

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();

    setTimeout(() => {
      oscillator.stop();
      void ctx.close();
    }, success ? 140 : 220);
  } catch {}
}

function vibrate(ms: number) {
  try {
    if ("vibrate" in navigator) {
      navigator.vibrate(ms);
    }
  } catch {}
}

export default function BarraScannerPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RedeemResponse | null>(null);
  const [lastToken, setLastToken] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");

  const scanLockRef = useRef(false);

  const parseToken = (rawValue: string) => {
    let token = rawValue.trim();

    try {
      if (token.startsWith("http://") || token.startsWith("https://")) {
        const url = new URL(token);
        token =
          url.searchParams.get("token") ||
          url.searchParams.get("qr") ||
          url.pathname.split("/").pop() ||
          token;
      }
    } catch {}

    return token.trim();
  };

  const redeemToken = useCallback(
    async (rawValue: string) => {
      if (!rawValue || loading || scanLockRef.current) return;

      scanLockRef.current = true;
      setLoading(true);
      setResult(null);

      try {
        const token = parseToken(rawValue);
        setLastToken(token);

        const { data, error } = await supabase.rpc("redeem_reward_qr", {
          p_qr_token: token,
        });

        if (error) {
          const failResult: RedeemResponse = {
            ok: false,
            code: "rpc_error",
            message: error.message || "Error al confirmar canje",
          };
          setResult(failResult);
          playBeep(false);
          vibrate(250);
          return;
        }

        const finalResult = data as RedeemResponse;
        setResult(finalResult);

        if (finalResult.ok) {
          playBeep(true);
          vibrate(120);
        } else {
          playBeep(false);
          vibrate(250);
        }
      } finally {
        setLoading(false);

        setTimeout(() => {
          scanLockRef.current = false;
        }, 1500);
      }
    },
    [loading, supabase]
  );

  const handleManualSubmit = async () => {
    await redeemToken(manualToken);
  };

  const canUseScanner =
    profile?.role === "admin" ||
    profile?.role === "barra" ||
    profile?.role === "cajero" ||
    profile?.role === "cashier";

  if (!canUseScanner) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
          <XCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <h1 className="text-2xl font-bold mb-2">Sin acceso</h1>
          <p className="text-white/70">
            Esta interfaz es solo para usuarios de barra o administración.
          </p>
        </div>
      </div>
    );
  }

  const success = result?.ok === true;
  const failed = result?.ok === false;

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>

          <h1 className="text-xl md:text-2xl font-bold tracking-wide">
            Scanner de Barra
          </h1>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-3 mb-2">
                <ScanLine className="h-6 w-6 text-yellow-400" />
                <h2 className="text-xl font-bold">Escanear QR</h2>
              </div>

              <p className="text-white/70 mb-4">
                Escaneá el QR del cliente para confirmar el canje en barra.
              </p>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <QRScanner onScan={redeemToken} paused={loading} />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Keyboard className="h-5 w-5 text-fuchsia-300" />
                <h2 className="font-semibold">Confirmar por token manual</h2>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <input
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Pegá el token del QR"
                  className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                />

                <button
                  onClick={handleManualSubmit}
                  disabled={loading || !manualToken.trim()}
                  className="rounded-xl bg-fuchsia-600 px-5 py-3 font-semibold text-white disabled:opacity-50 hover:bg-fuchsia-500"
                >
                  Confirmar
                </button>
              </div>
            </div>

            {loading && (
              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-yellow-300 animate-pulse" />
                  <p className="font-medium">Validando canje...</p>
                </div>
              </div>
            )}
          </div>

          <div>
            <div
              className={`min-h-[420px] rounded-[32px] border p-6 md:p-8 shadow-2xl transition-all ${
                success
                  ? "border-green-500/30 bg-green-500/15"
                  : failed
                  ? "border-red-500/30 bg-red-500/15"
                  : "border-white/10 bg-white/5"
              }`}
            >
              {!result && !loading && (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <ScanLine className="h-16 w-16 text-white/25 mb-5" />
                  <h2 className="text-3xl font-extrabold text-white/90">
                    Esperando QR
                  </h2>
                  <p className="mt-3 text-white/55 max-w-sm">
                    Escaneá un QR o pegá un token manual para confirmar el canje.
                  </p>
                </div>
              )}

              {loading && (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <Clock className="h-16 w-16 text-yellow-300 animate-pulse mb-5" />
                  <h2 className="text-3xl font-extrabold text-yellow-200">
                    VALIDANDO...
                  </h2>
                  <p className="mt-3 text-white/65">
                    Consultando estado del QR
                  </p>
                </div>
              )}

              {result && success && (
                <div className="h-full flex flex-col justify-center text-center">
                  <CheckCircle className="mx-auto h-20 w-20 text-green-400 mb-5" />
                  <h2 className="text-4xl md:text-5xl font-black tracking-wide text-green-300">
                    CANJE OK
                  </h2>

                  <div className="mt-6 rounded-3xl border border-green-400/20 bg-black/20 p-5">
                    <p className="text-sm uppercase tracking-[0.25em] text-green-200/70">
                      Recompensa
                    </p>
                    <p className="mt-2 text-2xl md:text-3xl font-extrabold text-white">
                      {result.reward_name || "Recompensa"}
                    </p>

                    {typeof result.points_cost === "number" && (
                      <p className="mt-3 text-xl md:text-2xl font-bold text-green-200">
                        -{result.points_cost} créditos
                      </p>
                    )}
                  </div>

                  {lastToken && (
                    <p className="mt-5 break-all text-xs text-white/45">
                      {lastToken}
                    </p>
                  )}
                </div>
              )}

              {result && failed && (
                <div className="h-full flex flex-col justify-center text-center">
                  <XCircle className="mx-auto h-20 w-20 text-red-400 mb-5" />
                  <h2 className="text-4xl md:text-5xl font-black tracking-wide text-red-300">
                    ERROR
                  </h2>

                  <div className="mt-6 rounded-3xl border border-red-400/20 bg-black/20 p-5">
                    <p className="text-xl md:text-2xl font-bold text-white">
                      {result.message}
                    </p>

                    {result.code && (
                      <p className="mt-3 text-sm uppercase tracking-[0.2em] text-red-200/70">
                        Estado: {result.code}
                      </p>
                    )}
                  </div>

                  {lastToken && (
                    <p className="mt-5 break-all text-xs text-white/45">
                      {lastToken}
                    </p>
                  )}
                </div>
              )}
            </div>

            {result && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                <div className="space-y-1">
                  <p>
                    <span className="text-white">Mensaje:</span> {result.message}
                  </p>
                  {result.reward_name && (
                    <p>
                      <span className="text-white">Recompensa:</span>{" "}
                      {result.reward_name}
                    </p>
                  )}
                  {typeof result.points_cost === "number" && (
                    <p>
                      <span className="text-white">Costo:</span>{" "}
                      {result.points_cost} créditos
                    </p>
                  )}
                  {lastToken && (
                    <p className="break-all">
                      <span className="text-white">Token:</span> {lastToken}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}