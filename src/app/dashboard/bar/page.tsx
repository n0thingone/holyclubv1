"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useActiveEvent } from "@/hooks/useActiveEvent";
import QRScanner from "@/components/scanner/QRScanner";
import { isWithinTime } from "@/lib/utils";
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ScanLine,
  LogIn,
  Zap,
} from "lucide-react";
import type { ScanResult } from "@/types";

type ScannerMode = "auto" | "entrada" | "gold";

interface RecentEntry {
  id: string;
  name: string;
  rrpp: string;
  time: string;
  result: string;
  color: string;
}

export default function ScannerPage() {
  const { event, refreshEvent } = useActiveEvent();
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [nightStats, setNightStats] = useState({
    valid: 0,
    invalid: 0,
    gold: 0,
  });
  const [mode, setMode] = useState<ScannerMode>("auto");
  const [processing, setProcessing] = useState(false);

  const processingRef = useRef(false);
  const supabase = getSupabaseClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setStaffId(user.id);
    });
  }, [supabase]);

  const handleScan = useCallback(
    async (token: string) => {
      if (processingRef.current || !event || !staffId) return;

      processingRef.current = true;
      setProcessing(true);

      try {
        const result = await processQr(token, event.id, staffId, mode);
        setScanResult(result);
      } finally {
        setTimeout(() => {
          setScanResult(null);
          setProcessing(false);
          processingRef.current = false;
        }, 2500);
      }
    },
    [event, staffId, mode]
  );

  async function processQr(
    token: string,
    eventId: string,
    by: string,
    scannerMode: ScannerMode
  ): Promise<ScanResult> {

    // 🔥 PARSE TOKEN (LA CLAVE)
    let cleanToken = token.trim();

    try {
      if (cleanToken.startsWith("http://") || cleanToken.startsWith("https://")) {
        const url = new URL(cleanToken);

        cleanToken =
          url.searchParams.get("token") ||
          url.searchParams.get("qr") ||
          "";

        if (!cleanToken) {
          const parts = url.pathname.split("/");
          cleanToken = parts[parts.length - 1];
        }
      }
    } catch {}

    cleanToken = cleanToken.trim();

    // 🔥 GOLD
   const { data: gold } = await supabase
  .from("gold_qrs")
  .select("*")
  .eq("qr_token", cleanToken)
  .eq("event_id", eventId)
  .maybeSingle<{
    used_count: number;
    max_uses: number;
    id: string;
    title?: string | null;
  }>();

    if (gold) {
      if (scannerMode === "entrada") {
        return {
          success: false,
          result: "invalid_qr",
          message: "QR GOLD en modo ENTRADA",
          color: "yellow",
        };
      }

     if ((gold?.used_count ?? 0) >= (gold?.max_uses ?? 0)) {
        return {
          success: false,
          result: "used_qr",
          message: "QR GOLD agotado",
          color: "red",
        };
      }

     await (supabase as any)
  .from("gold_qrs")
  .update({ used_count: (gold?.used_count ?? 0) + 1 })
  .eq("id", gold.id);

      return {
        success: true,
        result: "gold_entry",
        message: gold.title || "GOLD ENTRY",
        color: "gold",
      };
    }

    // 🔥 FREE (guest)
 const { data: g } = await supabase
  .from("guest_registrations")
  .select("*")
  .eq("qr_token", cleanToken)
  .eq("event_id", eventId)
  .maybeSingle<{
    id: string;
    first_name: string;
    last_name: string;
    registration_status: string | null;
  }>();

    if (!g) {
      return {
        success: false,
        result: "invalid_qr",
        message: "QR no encontrado",
        color: "red",
      };
    }

    if (scannerMode === "gold") {
      return {
        success: false,
        result: "invalid_qr",
        message: "QR FREE en modo GOLD",
        color: "yellow",
      };
    }

   if (g?.registration_status === "checked_in") {
      return {
        success: false,
        result: "used_qr",
        message: "Ya ingresó",
        color: "red",
      };
    }

    if (!isWithinTime(event?.qr_entry_until ?? null)) {
      return {
        success: false,
        result: "expired_qr",
        message: "QR vencido",
        color: "yellow",
      };
    }

  await (supabase as any)
  .from("guest_registrations")
  .update({ registration_status: "checked_in" })
  .eq("id", g.id);

    return {
      success: true,
      result: "valid_entry",
      message: `${g.first_name} ${g.last_name}`,
      color: "green",
    };
  }

  return (
    <div className="px-4 py-6 max-w-sm mx-auto space-y-4">
      <h1 className="text-xl font-bold text-white">TAQUILLA</h1>

      {!scanResult ? (
        <QRScanner onScan={handleScan} paused={processing} />
      ) : (
        <div className="text-center">
          <p className="text-white text-xl">{scanResult.message}</p>
        </div>
      )}

      {scanResult && (
        <button
          onClick={() => setScanResult(null)}
          className="holy-btn-secondary w-full"
        >
          ESCANEAR OTRO
        </button>
      )}
    </div>
  );
}