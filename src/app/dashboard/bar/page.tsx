"use client";

import { useState, useCallback, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useActiveEvent } from "@/hooks/useActiveEvent";
import { QRScanner } from "@/components/scanner/QRScanner";
import { CheckCircle, XCircle, RefreshCw, GlassWater } from "lucide-react";

type ScanType = "benefit" | "reward" | "promo" | "invalid" | "used";

interface BarScanResult {
  type: ScanType;
  title: string;
  description?: string;
  rrppName?: string;
  success: boolean;
}

export default function BarPage() {
  const { event } = useActiveEvent();
  const [scanResult, setScanResult] = useState<BarScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanActive, setScanActive] = useState(true);
  const { profile } = useAuth();
  const staffId = profile?.id ?? null;
  const supabase = getSupabaseClient();

  const handleScan = useCallback(
    async (token: string) => {
      if (isProcessing || !staffId) return;
      setIsProcessing(true);
      setScanActive(false);

      try {
        const result = await processBarQr(token, staffId);
        setScanResult(result);
      } catch {
        setScanResult({ type: "invalid", title: "Error", success: false });
      }

      setTimeout(() => {
        setScanResult(null);
        setScanActive(true);
        setIsProcessing(false);
      }, 4000);
    },
    [isProcessing, staffId]
  );

  async function processBarQr(
    token: string,
    redeemedBy: string
  ): Promise<BarScanResult> {
    // Check benefit (vaso litro) - benefits don't have QR tokens, they're issued per event
    // Bar staff redeems by checking rrpp manually, but for now check reward QRs

    // Check reward QR
    const { data: reward } = await supabase
      .from("rrpp_event_rewards")
      .select("*, rrpp_profiles(display_name)")
      .eq("qr_token", token)
      .single();

    if (reward) {
      if (reward.status === "redeemed") {
        return {
          type: "used",
          title: "Premio ya canjeado",
          description: `${reward.title}`,
          rrppName: reward.rrpp_profiles?.display_name,
          success: false,
        };
      }
      if (reward.status !== "unlocked") {
        return {
          type: "invalid",
          title: "Premio no disponible",
          description: `Estado: ${reward.status}`,
          success: false,
        };
      }

      await supabase
        .from("rrpp_event_rewards")
        .update({
          status: "redeemed",
          redeemed_at: new Date().toISOString(),
          redeemed_by: redeemedBy,
        })
        .eq("id", reward.id);

      return {
        type: "reward",
        title: reward.title,
        description: "Premio canjeado con éxito",
        rrppName: reward.rrpp_profiles?.display_name,
        success: true,
      };
    }

    // Check promo QR
    const { data: promo } = await supabase
      .from("promo_qrs")
      .select("*")
      .eq("qr_token", token)
      .single();

    if (promo) {
      if (promo.status !== "active") {
        return {
          type: "used",
          title: "Promo inactiva",
          description: promo.title,
          success: false,
        };
      }
      if (promo.used_count >= promo.max_uses) {
        return {
          type: "used",
          title: "Promo agotada",
          description: promo.title,
          success: false,
        };
      }

      // Check time validity
      if (promo.valid_until && new Date() > new Date(promo.valid_until)) {
        return {
          type: "used",
          title: "Promo vencida",
          description: promo.title,
          success: false,
        };
      }

      await supabase
        .from("promo_qrs")
        .update({ used_count: promo.used_count + 1 })
        .eq("id", promo.id);

      await supabase.from("promo_redemptions").insert({
        promo_id: promo.id,
        redeemed_by: redeemedBy,
      });

      return {
        type: "promo",
        title: promo.title,
        description: promo.description || "Canje exitoso",
        success: true,
      };
    }

    return {
      type: "invalid",
      title: "QR inválido",
      description: "No se encontró este QR",
      success: false,
    };
  }

  return (
    <div className="px-4 py-6 space-y-6 max-w-sm mx-auto">
      <div>
        <h1 className="font-display text-2xl font-black tracking-widest text-white flex items-center gap-2">
          <GlassWater className="w-6 h-6 text-accent-purple" />
          BARRA
        </h1>
        <p className="text-text-muted text-sm mt-1">
          Escáner de premios y promos
        </p>
      </div>

      {!scanResult && (
        <div className="animate-fade-in">
          <QRScanner onScan={handleScan} active={scanActive} />
          <p className="text-center text-text-muted text-xs mt-3 tracking-widest uppercase">
            Apunta al QR de premio o promo
          </p>
        </div>
      )}

      {scanResult && (
        <div
          className={`holy-card border-2 text-center py-10 px-4 animate-scale-in ${
            scanResult.success
              ? "bg-success/10 border-success/40 shadow-[0_0_40px_rgba(34,197,94,0.3)]"
              : "bg-danger/10 border-danger/40 shadow-[0_0_40px_rgba(239,68,68,0.3)]"
          }`}
        >
          {scanResult.success ? (
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-success" />
          ) : (
            <XCircle className="w-16 h-16 mx-auto mb-4 text-danger" />
          )}

          <div
            className={`font-display text-2xl font-black tracking-widest mb-2 ${
              scanResult.success ? "text-success" : "text-danger"
            }`}
          >
            {scanResult.success ? "VÁLIDO ✓" : "INVÁLIDO ✗"}
          </div>

          <p className="text-text-primary text-xl font-bold mb-1">
            {scanResult.title}
          </p>

          {scanResult.description && (
            <p className="text-text-muted text-sm">{scanResult.description}</p>
          )}

          {scanResult.rrppName && (
            <p className="text-text-muted text-sm mt-2">
              RRPP:{" "}
              <span className="text-accent-purple font-semibold">
                {scanResult.rrppName}
              </span>
            </p>
          )}

          <p className="text-text-muted text-xs mt-4">
            {new Date().toLocaleTimeString("es-AR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>
        </div>
      )}

      {scanResult && (
        <button
          onClick={() => {
            setScanResult(null);
            setScanActive(true);
            setIsProcessing(false);
          }}
          className="holy-btn-secondary flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          ESCANEAR OTRO
        </button>
      )}
    </div>
  );
}
