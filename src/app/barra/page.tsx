"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import QRScanner from "@/components/scanner/QRScanner";
import ScanResultModal from "@/components/scanner/ScanResultModal";
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

type ModalState = {
  open: boolean;
  status: "loading" | "success" | "error";
  title?: string;
  message?: string;
  detail?: string;
};

function playBeep(success: boolean) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;

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
  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    status: "loading",
    title: "",
    message: "",
    detail: "",
  });

  const scanLockRef = useRef(false);

  const parseToken = (rawValue: string) => {
    let token = rawValue.trim();

    try {
      if (token.startsWith("http://") || token.startsWith("https://")) {
        const url = new URL(token);

        token =
          url.searchParams.get("token") ||
          url.searchParams.get("qr") ||
          "";

        if (!token) {
          const parts = url.pathname.split("/");
          token = parts[parts.length - 1];
        }
      }
    } catch {}

    return token.trim();
  };

  const closeModalLater = (ms = 1800) => {
    setTimeout(() => {
      setModalState((prev) => ({ ...prev, open: false }));
    }, ms);
  };

  const redeemToken = useCallback(
    async (rawValue: string) => {
      if (!rawValue || loading || scanLockRef.current) return;

      scanLockRef.current = true;
      setLoading(true);
      setResult(null);

      setModalState({
        open: true,
        status: "loading",
        title: "VALIDANDO QR...",
        message: "Esperá un segundo",
        detail: "Procesando canje en barra",
      });

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
          setModalState({
            open: true,
            status: "error",
            title: "NO VÁLIDO",
            message: failResult.message,
            detail: "No se pudo confirmar el canje",
          });
          playBeep(false);
          vibrate(250);
          closeModalLater(2200);
          return;
        }

        const finalResult = data as RedeemResponse;
        setResult(finalResult);

        if (finalResult.ok) {
          setModalState({
            open: true,
            status: "success",
            title: "ESCANEADO",
            message: finalResult.reward_name || "Canje aplicado correctamente",
            detail: finalResult.points_cost
              ? `Descuento aplicado: ${finalResult.points_cost} créditos`
              : "Canje confirmado en barra",
          });
          playBeep(true);
          vibrate(120);
          setManualToken("");
          closeModalLater(1800);
        } else {
          setModalState({
            open: true,
            status: "error",
            title: "NO VÁLIDO",
            message: finalResult.message || "No se pudo procesar el QR",
            detail:
              finalResult.code === "used"
                ? "Este QR ya fue utilizado"
                : finalResult.code === "expired"
                ? "Este QR está vencido"
                : "Verificá el QR o probá con token manual",
          });
          playBeep(false);
          vibrate(250);
          closeModalLater(2200);
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
    profile?.role === "bar" ||
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
    <>
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

                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <QRScanner onScan={redeemToken} paused={loading} />
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Keyboard className="h-5 w-5 text-fuchsia-300" />
                  <h2 className="font-semibold">Token manual</h2>
                </div>

                <div className="flex gap-3">
                  <input
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="Pegá el token"
                    className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                  />

                  <button
                    onClick={handleManualSubmit}
                    disabled={loading || !manualToken.trim()}
                    className="rounded-xl bg-fuchsia-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>

            <div>
              <div
                className={`min-h-[420px] rounded-[32px] border p-6 md:p-8 transition ${
                  success
                    ? "border-green-500/30 bg-green-500/15"
                    : failed
                    ? "border-red-500/30 bg-red-500/15"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3 mb-5">
                  {success ? (
                    <CheckCircle className="h-8 w-8 text-green-400" />
                  ) : failed ? (
                    <XCircle className="h-8 w-8 text-red-400" />
                  ) : (
                    <Clock className="h-8 w-8 text-white/50" />
                  )}

                  <div>
                    <h2 className="text-xl font-bold">
                      {success
                        ? "Canje confirmado"
                        : failed
                        ? "Canje rechazado"
                        : "Esperando escaneo"}
                    </h2>
                    <p className="text-sm text-white/60">
                      {loading
                        ? "Validando..."
                        : result?.message || "Escaneá un QR o pegá un token"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-2">
                      Último token
                    </p>
                    <p className="break-all text-sm text-white/80">
                      {lastToken || "Todavía no se escaneó ninguno"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-2">
                      Estado
                    </p>
                    <p
                      className={`text-sm font-semibold ${
                        success
                          ? "text-green-300"
                          : failed
                          ? "text-red-300"
                          : "text-white/70"
                      }`}
                    >
                      {success
                        ? "OK"
                        : failed
                        ? result?.code || "error"
                        : "Sin validar"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-2">
                      Detalle
                    </p>
                    <div className="space-y-2 text-sm text-white/80">
                      <p>
                        <span className="text-white/50">Reward:</span>{" "}
                        {result?.reward_name || "—"}
                      </p>
                      <p>
                        <span className="text-white/50">Créditos:</span>{" "}
                        {typeof result?.points_cost === "number"
                          ? result.points_cost
                          : "—"}
                      </p>
                      <p>
                        <span className="text-white/50">Mensaje:</span>{" "}
                        {result?.message || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ScanResultModal
        open={modalState.open}
        status={modalState.status}
        title={modalState.title}
        message={modalState.message}
        detail={modalState.detail}
      />
    </>
  );
}