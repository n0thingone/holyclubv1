// @ts-nocheck
"use client";

import { useState, useCallback } from "react";
import QRScanner from "@/components/scanner/QRScanner";
import ScanResultModal from "@/components/scanner/ScanResultModal";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

import {
  ScanLine,
  Zap,
  DoorOpen,
} from "lucide-react";

type Mode = "entrada" | "barra";

export default function ScanPage() {
  const [mode, setMode] = useState<Mode>("entrada");
  const [loading, setLoading] = useState(false);

  const supabase = getSupabaseClient();
  const { setLiveHolyPoints, refreshProfile } = useAuth();

  const [modal, setModal] = useState({
    open: false,
    status: "loading" as "loading" | "success" | "error",
    title: "",
    message: "",
  });

  const closeModal = (ms = 1800) => {
    setTimeout(() => {
      setModal((p) => ({ ...p, open: false }));
    }, ms);
  };

  const handleScan = useCallback(
    async (token: string) => {
      if (loading) return;

      setLoading(true);

      setModal({
        open: true,
        status: "loading",
        title: "Procesando...",
        message: mode === "entrada" ? "Validando ingreso" : "Validando canje",
      });

      try {
        if (mode === "barra") {
          const { data, error } = await supabase.rpc("redeem_reward_qr", {
            p_qr_token: token,
          });

          if (error || !data?.ok) {
            setModal({
              open: true,
              status: "error",
              title: "NO VÁLIDO",
              message: data?.message || error?.message || "No se pudo validar el canje",
            });
            closeModal(2000);
            return;
          }

          const nextBalance = Number(
            data?.new_balance ?? data?.available_points ?? 0
          );

          setLiveHolyPoints(nextBalance);
          await refreshProfile();

          setModal({
            open: true,
            status: "success",
            title: "CANJE OK",
            message: data?.reward_name
              ? `${data.reward_name} · Saldo nuevo: ${nextBalance}`
              : `Saldo nuevo: ${nextBalance}`,
          });

          closeModal();
          return;
        }

        const { data: g } = await supabase
          .from("guest_registrations")
          .select("*")
          .eq("qr_token", token)
          .maybeSingle();

        if (g) {
          setModal({
            open: true,
            status: "success",
            title: "ENTRA FREE",
            message: `${g.first_name} ${g.last_name}`,
          });
          closeModal();
          return;
        }

        const { data: gold } = await supabase
          .from("gold_qrs")
          .select("*")
          .eq("qr_token", token)
          .maybeSingle();

        if (gold) {
          setModal({
            open: true,
            status: "success",
            title: "✦ GOLD ENTRY",
            message: gold.title,
          });
          closeModal();
          return;
        }

        setModal({
          open: true,
          status: "error",
          title: "QR INVÁLIDO",
          message: "No existe o no corresponde",
        });

        closeModal(2000);
      } catch (err: any) {
        console.error("Scan error:", err);
        setModal({
          open: true,
          status: "error",
          title: "ERROR",
          message: err?.message || "Ocurrió un error al procesar el QR",
        });
        closeModal(2000);
      } finally {
        setLoading(false);
      }
    },
    [mode, loading, supabase, setLiveHolyPoints, refreshProfile]
  );

  return (
    <>
      <div className="min-h-screen bg-black text-white p-4">
        <div className="max-w-md mx-auto space-y-5">
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-widest flex items-center justify-center gap-2">
              <ScanLine className="w-5 h-5 text-fuchsia-400" />
              SCAN QR
            </h1>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode("entrada")}
              className={`rounded-xl py-3 font-bold ${
                mode === "entrada" ? "bg-fuchsia-600" : "bg-white/10"
              }`}
            >
              <DoorOpen className="mx-auto mb-1 w-4 h-4" />
              ENTRADA
            </button>

            <button
              onClick={() => setMode("barra")}
              className={`rounded-xl py-3 font-bold ${
                mode === "barra" ? "bg-fuchsia-600" : "bg-white/10"
              }`}
            >
              <Zap className="mx-auto mb-1 w-4 h-4" />
              BARRA
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 p-4 bg-black/40">
            <QRScanner onScan={handleScan} paused={loading} />
          </div>

          <p className="text-center text-xs text-white/50 uppercase tracking-widest">
            {mode === "entrada"
              ? "Modo entrada activo"
              : "Modo barra activo"}
          </p>
        </div>
      </div>

      <ScanResultModal
        open={modal.open}
        status={modal.status}
        title={modal.title}
        message={modal.message}
      />
    </>
  );
}