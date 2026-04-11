"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useActiveEvent } from "@/hooks/useActiveEvent";
import { useAuth } from "@/context/AuthContext";
import QRScanner from "@/components/scanner/QRScanner";
import ScanResultModal from "@/components/scanner/ScanResultModal";
import DashboardShell from "@/components/navigation/DashboardShell";
import { isWithinTime } from "@/lib/utils";
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ScanLine,
  LogIn,
  Zap,
  DoorOpen,
  Keyboard,
  Crown,
  AlertTriangle,
  Camera,
  Usb,
  Crosshair,
} from "lucide-react";

type MainMode = "entrada" | "barra";
type ScanInputMode = "camera" | "zebra";

const GUEST_ENTRY_POINTS = 2500;

type EntryScanResult = {
  success: boolean;
  result: "valid_entry" | "gold_entry" | "used_qr" | "expired_qr" | "invalid_qr";
  message: string;
  color: "green" | "yellow" | "red" | "gold";
  rrppName?: string;
  guest?: any;
  clientPointsAdded?: number;
};

type RedeemResponse = {
  ok: boolean;
  code: string;
  message: string;
  redemption_id?: string;
  reward_id?: string;
  reward_name?: string;
  reward?: string;
  points_cost?: number | null;
  user_id?: string;
  token?: string;
  short_token?: string;
  new_balance?: number;
  source?: string;
};

type ModalState = {
  open: boolean;
  status: "loading" | "success" | "error" | "gold";
  title?: string;
  message?: string;
  detail?: string;
};

interface RecentEntry {
  id: string;
  name: string;
  rrpp: string;
  time: string;
  result: string;
  color: string;
}

interface RecentBarScan {
  id: string;
  title: string;
  detail: string;
  status: "ok" | "error";
  time: string;
}

function playBeep(success: boolean, isGold = false) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;

    if (!AudioCtx) return;

    const ctx = new AudioCtx();

    const beep = (frequency: number, duration: number, delay = 0) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gainNode.gain.value = 0.05;

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      const startAt = ctx.currentTime + delay;
      oscillator.start(startAt);
      oscillator.stop(startAt + duration / 1000);
    };

    if (isGold) {
      beep(880, 90, 0);
      beep(1175, 120, 0.12);
      beep(1568, 130, 0.26);
    } else if (success) {
      beep(1040, 110, 0);
    } else {
      beep(240, 130, 0);
      beep(180, 170, 0.16);
    }

    setTimeout(() => {
      void ctx.close();
    }, isGold ? 650 : success ? 220 : 500);
  } catch {}
}

function vibrate(ms: number | number[]) {
  try {
    if ("vibrate" in navigator) navigator.vibrate(ms);
  } catch {}
}

function extractRawToken(rawValue: string) {
  if (!rawValue) return "";

  const raw = String(rawValue).trim();

  try {
    if (raw.startsWith("http")) {
      const url = new URL(raw);
      const fromParams =
        url.searchParams.get("token") ||
        url.searchParams.get("qr") ||
        url.searchParams.get("code") ||
        url.searchParams.get("id");
      if (fromParams) return String(fromParams).trim();

      const parts = url.pathname.split("/").filter(Boolean);
      const hcPart = parts.find((part) => /HC[-\s]?[A-Z0-9]+/i.test(part));
      if (hcPart) return hcPart.trim();

      if (parts.length > 0) return parts[parts.length - 1] || raw;
    }
  } catch {}

  const gs1Clean = raw.replace(/^\][A-Z0-9]{2}/i, "").trim();

  const hcMatch =
    gs1Clean.match(/HC[-\s]?[A-Z0-9-]{4,}/i) ||
    gs1Clean.match(/[A-Z0-9-]*HC[-\s]?[A-Z0-9-]{4,}/i);

  if (hcMatch?.[0]) return hcMatch[0].trim();

  const compact = gs1Clean
    .replace(/[\r\n\t]+/g, "")
    .replace(/[“”"'`´]/g, "")
    .replace(/[–—]/g, "-")
    .trim();

  return compact;
}

function normalizeScannerToken(value: string) {
  return extractRawToken(value)
    .toUpperCase()
    .replace(/^\][A-Z0-9]{2}/i, "")
    .replace(/[“”"'`´]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9-]/g, "");
}

function normalizeDbToken(value: string) {
  return String(value || "")
    .toUpperCase()
    .replace(/^\][A-Z0-9]{2}/i, "")
    .replace(/[“”"'`´]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9-]/g, "");
}

function buildTokenVariants(rawValue: string) {
  const base = normalizeScannerToken(rawValue);
  if (!base) return [];

  const noPrefix = base.replace(/^.*?(HC[-A-Z0-9]+)/, "$1");
  const compact = noPrefix.replace(/-/g, "");
  const noHC = compact.replace(/^HC/, "");
  const withHC = noHC ? `HC${noHC}` : "";

  const variants = new Set<string>([
    base,
    noPrefix,
    compact,
    noPrefix.replace(/-/g, ""),
    base.replace(/-/g, ""),
    withHC,
    base.replace(/I/g, "1"),
    compact.replace(/I/g, "1"),
    withHC.replace(/I/g, "1"),
    base.replace(/O/g, "0"),
    compact.replace(/O/g, "0"),
    withHC.replace(/O/g, "0"),
    base.replace(/I/g, "1").replace(/O/g, "0"),
    compact.replace(/I/g, "1").replace(/O/g, "0"),
    withHC.replace(/I/g, "1").replace(/O/g, "0"),
  ]);

  return Array.from(variants).filter(Boolean);
}

function tokenMatchesDb(qrTokenFromDb: string, rawScannedValue: string) {
  const db = normalizeDbToken(qrTokenFromDb);
  const dbCompact = db.replace(/-/g, "");
  const dbNoPrefix = db.replace(/^.*?(HC[-A-Z0-9]+)/, "$1");
  const dbNoPrefixCompact = dbNoPrefix.replace(/-/g, "");
  const variants = buildTokenVariants(rawScannedValue);

  return variants.some(
    (v) =>
      v === db ||
      v === dbCompact ||
      v === dbNoPrefix ||
      v === dbNoPrefixCompact ||
      db.includes(v) ||
      dbCompact.includes(v)
  );
}

function getNiceRewardName(result: RedeemResponse) {
  if (!result?.ok) return "CANJE RECHAZADO";

  const value = (result.reward_name || result.reward || "").toLowerCase();

  if (value === "shot") return "SHOT 🍹";
  if (value === "pinta") return "PINTA 🍺";
  if (value === "mystery_box") return "MYSTERY BOX 🎁";
  if (value === "free") return "FREE 🎟️";
  if (value === "gold") return "GOLD ⭐";

  return result.reward_name || result.reward || "CANJE OK";
}

export default function ScanPage() {
  const supabase = getSupabaseClient();
  const { event, refreshEvent } = useActiveEvent();
  const { profile, setLiveHolyPoints, refreshProfile } = useAuth();

  const [mainMode, setMainMode] = useState<MainMode>("entrada");
  const [scanInputMode, setScanInputMode] = useState<ScanInputMode>("camera");

  const [staffId, setStaffId] = useState<string | null>(null);

  const [processing, setProcessing] = useState(false);
  const processingRef = useRef(false);

  const [manualToken, setManualToken] = useState("");
  const [zebraBuffer, setZebraBuffer] = useState("");
  const zebraInputRef = useRef<HTMLInputElement | null>(null);
  const zebraSubmitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modalCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    status: "loading",
    title: "",
    message: "",
    detail: "",
  });

  const [entryScanResult, setEntryScanResult] = useState<EntryScanResult | null>(null);
  const [barResult, setBarResult] = useState<RedeemResponse | null>(null);
  const [barFlash, setBarFlash] = useState<"success" | "error" | null>(null);
  const [lastBarToken, setLastBarToken] = useState<string | null>(null);

  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([]);
  const [recentBarScans, setRecentBarScans] = useState<RecentBarScan[]>([]);

  const [nightStats, setNightStats] = useState({
    valid: 0,
    invalid: 0,
    gold: 0,
  });

  const canUseScanner =
    profile?.role === "admin" ||
    profile?.role === "bar" ||
    profile?.role === "cashier" ||
    profile?.role === "cajero";

  const clearBarResetTimeout = () => {
    if (barResetTimeoutRef.current) {
      clearTimeout(barResetTimeoutRef.current);
      barResetTimeoutRef.current = null;
    }
  };

  const clearBarFlashTimeout = () => {
    if (barFlashTimeoutRef.current) {
      clearTimeout(barFlashTimeoutRef.current);
      barFlashTimeoutRef.current = null;
    }
  };

  const clearModalCloseTimeout = () => {
    if (modalCloseTimeoutRef.current) {
      clearTimeout(modalCloseTimeoutRef.current);
      modalCloseTimeoutRef.current = null;
    }
  };

  const closeModalLater = (ms = 1800) => {
    clearModalCloseTimeout();
    modalCloseTimeoutRef.current = setTimeout(() => {
      setModalState((prev) => ({ ...prev, open: false }));
      modalCloseTimeoutRef.current = null;
    }, ms);
  };

  const triggerBarFlash = (type: "success" | "error") => {
    clearBarFlashTimeout();
    setBarFlash(type);

    barFlashTimeoutRef.current = setTimeout(() => {
      setBarFlash(null);
      barFlashTimeoutRef.current = null;
    }, 450);
  };

  const resetBarResultLater = (ms: number) => {
    clearBarResetTimeout();
    barResetTimeoutRef.current = setTimeout(() => {
      setBarResult(null);
      clearBarResetTimeout();
    }, ms);
  };

  const focusZebraInput = useCallback(() => {
    if (scanInputMode !== "zebra") return;

    const input = zebraInputRef.current;
    if (!input) return;

    input.focus();
    input.select();
  }, [scanInputMode]);

  useEffect(() => {
    let alive = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!alive) return;
      if (user) setStaffId(user.id);
    });

    return () => {
      alive = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!event) {
      setNightStats({ valid: 0, invalid: 0, gold: 0 });
      return;
    }

    void fetchNightStats();

    const ch = supabase
      .channel(`scan-stats-${event.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "checkins",
          filter: `event_id=eq.${event.id}`,
        },
        () => {
          void fetchNightStats();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [event?.id, supabase]);

  useEffect(() => {
    if (scanInputMode !== "zebra") return;

    const t = setTimeout(() => {
      focusZebraInput();
    }, 120);

    const refocus = () => focusZebraInput();

    window.addEventListener("focus", refocus);
    window.addEventListener("click", refocus);

    return () => {
      clearTimeout(t);
      window.removeEventListener("focus", refocus);
      window.removeEventListener("click", refocus);
    };
  }, [scanInputMode, focusZebraInput]);

  useEffect(() => {
    return () => {
      if (zebraSubmitTimeoutRef.current) {
        clearTimeout(zebraSubmitTimeoutRef.current);
      }
      clearBarResetTimeout();
      clearBarFlashTimeout();
      clearModalCloseTimeout();
    };
  }, []);

  async function fetchNightStats() {
    if (!event) return;

    const { data, error } = await supabase
      .from("checkins")
      .select("result")
      .eq("event_id", event.id);

if (error || !data) return;

const checks = (data ?? []) as Array<{ result: string }>;

setNightStats({
  valid: checks.filter((c) => c.result === "valid_entry").length,
  gold: checks.filter((c) => c.result === "gold_entry").length,
  invalid: checks.filter((c) =>
    ["used_qr", "expired_qr", "invalid_qr"].includes(c.result)
  ).length,
});}

  async function tryAwardEntryPoints(guest: {
    id: string;
    user_id?: string | null;
    entry_points_awarded?: boolean;
  }) {
    if (!guest.user_id || !event?.id) return 0;

    try {
      const { data: existingMovement, error: existingError } = await supabase
        .from("holy_points_movements")
        .select("id")
        .eq("user_id", guest.user_id)
        .eq("event_id", event.id)
        .eq("type", "entry_free")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingError) {
        console.error("Error buscando movimiento previo de entrada:", existingError);
        return 0;
      }

      if (existingMovement) {
        const { error: markAlreadyError } = await supabase
          .from("guest_registrations")
          .update({ entry_points_awarded: true })
          .eq("id", guest.id);

        if (markAlreadyError) {
          console.error(
            "No se pudo marcar entry_points_awarded ya existente:",
            markAlreadyError
          );
        }

        return 0;
      }

      const { error: movementError } = await supabase
        .from("holy_points_movements")
        .insert({
          user_id: guest.user_id,
          event_id: event.id,
          amount: GUEST_ENTRY_POINTS,
          type: "entry_free",
          description: "Ingreso por lista free",
          created_at: new Date().toISOString(),
          movement_type: "credit",
        });

      if (movementError) {
        console.error("No se pudieron registrar los puntos de ingreso:", movementError);
        return 0;
      }

      const { data: currentPoints, error: currentPointsError } = await supabase
        .from("holy_points")
        .select("user_id, points")
        .eq("user_id", guest.user_id)
        .maybeSingle();

      if (currentPointsError) {
        console.error("No se pudo leer holy_points:", currentPointsError);
        return 0;
      }

      const newCreditsTotal = !currentPoints
        ? GUEST_ENTRY_POINTS
        : (currentPoints.points || 0) + GUEST_ENTRY_POINTS;

      if (!currentPoints) {
        const { error: insertPointsError } = await supabase
          .from("holy_points")
          .insert({
            user_id: guest.user_id,
            points: GUEST_ENTRY_POINTS,
            reason: "Ingreso por lista free",
            created_at: new Date().toISOString(),
          });

        if (insertPointsError) {
          console.error("No se pudo crear holy_points:", insertPointsError);
          return 0;
        }
      } else {
        const { error: updatePointsError } = await supabase
          .from("holy_points")
          .update({
            points: newCreditsTotal,
            reason: "Ingreso por lista free",
          })
          .eq("user_id", guest.user_id);

        if (updatePointsError) {
          console.error("No se pudo actualizar holy_points:", updatePointsError);
          return 0;
        }
      }

      const { error: markError } = await supabase
        .from("guest_registrations")
        .update({ entry_points_awarded: true })
        .eq("id", guest.id);

      if (markError) {
        console.error("No se pudo marcar entry_points_awarded:", markError);
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("holy-credits-updated", {
            detail: newCreditsTotal,
          })
        );
      }

      return GUEST_ENTRY_POINTS;
    } catch (err) {
      console.error("Error acreditando puntos de entrada:", err);
      return 0;
    }
  }

  const processEntryQr = useCallback(
    async (rawValue: string, eventId: string, by: string): Promise<EntryScanResult> => {
      const token = extractRawToken(rawValue);
      const scannedToken = normalizeScannerToken(rawValue);
      const tokenVariants = buildTokenVariants(rawValue);

      if (!scannedToken || tokenVariants.length === 0) {
        return {
          success: false,
          result: "invalid_qr",
          message: "QR inválido o vacío",
          color: "red",
        };
      }

      let gold: any = null;
      let goldError: any = null;

      for (const variant of tokenVariants) {
        const { data, error } = await supabase
          .from("gold_qrs")
          .select("*")
          .eq("event_id", eventId)
          .eq("qr_token", variant)
          .maybeSingle();

        if (error) {
          goldError = error;
          break;
        }

        if (data) {
          gold = data;
          break;
        }
      }

      if (!gold && !goldError) {
        const { data: candidates, error: fallbackError } = await supabase
          .from("gold_qrs")
          .select("*")
          .eq("event_id", eventId)
          .limit(1000);

        if (fallbackError) {
          goldError = fallbackError;
        } else {
          gold =
            candidates?.find((row) => tokenMatchesDb(row.qr_token || "", rawValue)) ?? null;
        }
      }

      if (goldError) {
        console.error("Error validando QR Gold:", goldError);
        return {
          success: false,
          result: "invalid_qr",
          message: "Error validando QR Gold",
          color: "red",
        };
      }

      if (gold) {
        if (
          gold.status !== "active" ||
          gold.used_count >= gold.max_uses ||
          (gold.expires_at && new Date(gold.expires_at).getTime() < Date.now())
        ) {
          await supabase.from("checkins").insert({
            event_id: eventId,
            checked_in_by: by,
            result: "used_qr",
          });

          return {
            success: false,
            result: "used_qr",
            message: "QR Gold agotado o vencido",
            color: "red",
          };
        }

        const { error: goldUpdateError } = await supabase
          .from("gold_qrs")
          .update({ used_count: (gold.used_count || 0) + 1 })
          .eq("id", gold.id);

        if (goldUpdateError) {
          console.error("No se pudo actualizar el QR Gold:", goldUpdateError);
          return {
            success: false,
            result: "invalid_qr",
            message: "No se pudo actualizar el QR Gold",
            color: "red",
          };
        }

        await supabase.from("checkins").insert({
          event_id: eventId,
          result: "gold_entry",
          checked_in_by: by,
        });

        return {
          success: true,
          result: "gold_entry",
          message: gold.title || "Ingreso Gold",
          color: "gold",
        };
      }

      let g: any = null;
      let guestError: any = null;

      for (const variant of tokenVariants) {
        const { data, error } = await supabase
          .from("guest_registrations")
          .select("*, rrpp_profiles(display_name)")
          .eq("event_id", eventId)
          .eq("qr_token", variant)
          .maybeSingle();

        if (error) {
          guestError = error;
          break;
        }

        if (data) {
          g = data;
          break;
        }
      }

      if (guestError) {
        console.error("Error validando invitado:", guestError);
        return {
          success: false,
          result: "invalid_qr",
          message: "Error validando invitado",
          color: "red",
        };
      }

      if (!g) {
        const { data: candidates, error: fallbackError } = await supabase
          .from("guest_registrations")
          .select(
            "id, event_id, rrpp_id, user_id, first_name, last_name, qr_token, registration_status, entry_points_awarded, rrpp_profiles(display_name)"
          )
          .eq("event_id", eventId)
          .ilike("qr_token", "HC-%")
          .limit(1500);

        if (fallbackError) {
          console.error("Error buscando coincidencia alternativa:", fallbackError);
          return {
            success: false,
            result: "invalid_qr",
            message: "Error buscando coincidencia alternativa",
            color: "red",
          };
        }

        g =
          candidates?.find((row) => tokenMatchesDb(row.qr_token || "", rawValue)) ?? null;
      }

      if (!g) {
        console.log("QR NO ENCONTRADO", {
          raw: rawValue,
          extracted: token,
          normalized: scannedToken,
          variants: tokenVariants,
          eventId,
        });

        await supabase.from("checkins").insert({
          event_id: eventId,
          checked_in_by: by,
          result: "invalid_qr",
        });

        return {
          success: false,
          result: "invalid_qr",
          message: "QR no encontrado",
          color: "red",
        };
      }

      if (g.registration_status === "checked_in") {
        await supabase.from("checkins").insert({
          event_id: eventId,
          registration_id: g.id,
          rrpp_id: g.rrpp_id,
          checked_in_by: by,
          result: "used_qr",
        });

        return {
          success: false,
          result: "used_qr",
          message: `${g.first_name} ${g.last_name} ya ingresó`,
          color: "red",
        };
      }

      if (!isWithinTime(event?.qr_entry_until ?? null)) {
        await supabase.from("checkins").insert({
          event_id: eventId,
          registration_id: g.id,
          rrpp_id: g.rrpp_id,
          checked_in_by: by,
          result: "expired_qr",
        });

        return {
          success: false,
          result: "expired_qr",
          message: "Horario de QR finalizado",
          color: "yellow",
        };
      }

      const { error: guestUpdateError } = await supabase
        .from("guest_registrations")
        .update({ registration_status: "checked_in" })
        .eq("id", g.id);

      if (guestUpdateError) {
        console.error("No se pudo registrar el ingreso:", guestUpdateError);
        return {
          success: false,
          result: "invalid_qr",
          message: "No se pudo registrar el ingreso",
          color: "red",
        };
      }

      await supabase.from("checkins").insert({
        event_id: eventId,
        registration_id: g.id,
        rrpp_id: g.rrpp_id,
        checked_in_by: by,
        result: "valid_entry",
      });

      const clientPointsAdded = await tryAwardEntryPoints({
        id: g.id,
        user_id: g.user_id,
        entry_points_awarded: g.entry_points_awarded,
      });

      return {
        success: true,
        result: "valid_entry",
        message: `${g.first_name} ${g.last_name}`,
        rrppName: g.rrpp_profiles?.display_name,
        guest: g,
        color: "green",
        clientPointsAdded,
      };
    },
    [supabase, event?.qr_entry_until]
  );

  const processBarQr = useCallback(
    async (rawValue: string): Promise<{ token: string; result: RedeemResponse }> => {
      const token = normalizeScannerToken(rawValue);

      if (!token) {
        return {
          token: "",
          result: {
            ok: false,
            code: "empty_token",
            message: "El QR o token está vacío",
          },
        };
      }

      const { data, error } = await supabase.rpc("redeem_reward_qr", {
        p_qr_token: token,
      });

      if (error) {
        return {
          token,
          result: {
            ok: false,
            code: "rpc_error",
            message: error.message || "Error al confirmar canje",
          },
        };
      }

      return {
        token,
        result: (data as RedeemResponse) || {
          ok: false,
          code: "empty_response",
          message: "La función no devolvió datos",
        },
      };
    },
    [supabase]
  );

  const handleUnifiedScan = useCallback(
    async (rawValue: string) => {
      if (!rawValue || processingRef.current) return;
      if (mainMode === "entrada" && (!event || !staffId)) return;
      if (mainMode === "barra" && !staffId) return;

      processingRef.current = true;
      setProcessing(true);

      if (mainMode === "entrada") {
        setEntryScanResult(null);
      } else {
        clearBarResetTimeout();
      }

      console.log("RAW SCAN:", rawValue);
      console.log("NORMALIZED:", normalizeScannerToken(rawValue));
      console.log("VARIANTS:", buildTokenVariants(rawValue));
      console.log("MAIN MODE:", mainMode);
      console.log("EVENT ID:", event?.id);

      setModalState({
        open: true,
        status: "loading",
        title: mainMode === "entrada" ? "Validando ingreso..." : "Procesando canje...",
        message: "Esperá un segundo",
        detail: "",
      });

      try {
        if (mainMode === "entrada") {
          const result = await processEntryQr(rawValue, event!.id, staffId!);
          setEntryScanResult(result);

          if (result.success) {
            if (result.result === "gold_entry") {
              playBeep(true, true);
              vibrate([80, 50, 120, 50, 160]);

              setModalState({
                open: true,
                status: "gold",
                title: "✦ GOLD ENTRY",
                message: result.message,
                detail: "Ingreso VIP habilitado",
              });
            } else {
              playBeep(true);
              vibrate(120);

              setModalState({
                open: true,
                status: "success",
                title: "ENTRA FREE",
                message: result.message,
                detail:
                  result.clientPointsAdded && result.clientPointsAdded > 0
                    ? `RRPP: ${result.rrppName || "—"} · +${result.clientPointsAdded} al cliente`
                    : result.rrppName
                      ? `RRPP: ${result.rrppName} · sin puntos extra (ya cobró este evento)`
                      : "Ingreso registrado",
              });
            }

            setRecentEntries((prev) =>
              [
                {
                  id: `${Date.now()}-${Math.random()}`,
                  name: result.message,
                  rrpp: result.rrppName || "—",
                  time: new Date().toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  result: result.result,
                  color: result.color,
                },
                ...prev,
              ].slice(0, 8)
            );

            closeModalLater(result.result === "gold_entry" ? 2200 : 1800);
          } else {
            playBeep(false);
            vibrate(250);

            setModalState({
              open: true,
              status: "error",
              title:
                result.result === "expired_qr"
                  ? "QR VENCIDO"
                  : result.result === "used_qr"
                    ? "QR YA USADO"
                    : "NO VÁLIDO",
              message: result.message,
              detail:
                result.result === "invalid_qr"
                  ? "Verificá el código o probá de nuevo"
                  : "No se pudo habilitar el ingreso",
            });

            closeModalLater(2200);
          }

          void fetchNightStats();
        } else {
          const { token, result } = await processBarQr(rawValue);

          setLastBarToken(token);
          setBarResult(result);

          if (result.ok) {
            if (typeof result.new_balance === "number") {
              setLiveHolyPoints(result.new_balance);
            }

            await refreshProfile();

            const niceRewardName = getNiceRewardName(result);

            playBeep(true);
            vibrate(120);
            triggerBarFlash("success");

            setModalState({
              open: true,
              status: "success",
              title: "CANJE OK",
              message: niceRewardName,
              detail:
                typeof result.new_balance === "number"
                  ? `Saldo nuevo: ${result.new_balance} créditos`
                  : typeof result.points_cost === "number"
                    ? `${result.points_cost} créditos`
                    : token
                      ? `Token: ${token}`
                      : "Reward confirmado en barra",
            });

            setRecentBarScans((prev) =>
              [
                {
                  id: `${Date.now()}-${Math.random()}`,
                  title: niceRewardName,
                  detail:
                    typeof result.new_balance === "number"
                      ? `Saldo: ${result.new_balance}`
                      : typeof result.points_cost === "number"
                        ? `${result.points_cost} créditos`
                        : result.short_token
                          ? `Manual: ${result.short_token}`
                          : result.message || `Token: ${token}`,
                  status: "ok",
                  time: new Date().toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                },
                ...prev,
              ].slice(0, 8)
            );

            setManualToken("");
            setZebraBuffer("");
            closeModalLater(1800);
            resetBarResultLater(5200);
          } else {
            playBeep(false);
            vibrate(250);
            triggerBarFlash("error");

            setModalState({
              open: true,
              status: "error",
              title:
                result.code === "already_redeemed" || result.code === "used"
                  ? "YA USADO"
                  : result.code === "expired"
                    ? "VENCIDO"
                    : result.code === "empty_token"
                      ? "TOKEN VACÍO"
                      : result.code === "rpc_error"
                        ? "ERROR SQL"
                        : "NO VÁLIDO",
              message: result.message || "No se pudo procesar el QR",
              detail: token
                ? `Token leído: ${token} · Code: ${result.code || "sin_code"}`
                : `Code: ${result.code || "sin_code"}`,
            });

            setRecentBarScans((prev) =>
              [
                {
                  id: `${Date.now()}-${Math.random()}`,
                  title: "ERROR",
                  detail: token
                    ? `${result.message || "No válido"} · ${token}`
                    : result.message || "No válido",
                  status: "error",
                  time: new Date().toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                },
                ...prev,
              ].slice(0, 8)
            );

            closeModalLater(2500);
            resetBarResultLater(5200);
          }
        }
      } finally {
        setTimeout(() => {
          setProcessing(false);
          processingRef.current = false;
          if (scanInputMode === "zebra") focusZebraInput();
        }, 1200);
      }
    },
    [
      mainMode,
      event,
      staffId,
      processEntryQr,
      processBarQr,
      setLiveHolyPoints,
      refreshProfile,
      scanInputMode,
      focusZebraInput,
    ]
  );

  const handleManualSubmit = async () => {
    if (!manualToken.trim()) return;
    await handleUnifiedScan(manualToken.trim());
  };

  const handleZebraSubmit = async (forcedValue?: string) => {
    const value = (forcedValue ?? zebraBuffer).trim();
    if (!value) return;
    if (processingRef.current) return;

    setZebraBuffer("");
    await handleUnifiedScan(value);
  };

  const handleZebraChange = (nextValue: string) => {
    setZebraBuffer(nextValue);

    if (zebraSubmitTimeoutRef.current) {
      clearTimeout(zebraSubmitTimeoutRef.current);
    }

    zebraSubmitTimeoutRef.current = setTimeout(() => {
      void handleZebraSubmit(nextValue);
    }, 180);
  };

  const RC = {
    green: {
      bg: "bg-emerald-500/10 border-emerald-400/40",
      text: "text-emerald-300",
      shadow: "shadow-[0_0_60px_rgba(16,185,129,0.25)]",
      Icon: CheckCircle,
    },
    yellow: {
      bg: "bg-yellow-500/10 border-yellow-400/40",
      text: "text-yellow-300",
      shadow: "shadow-[0_0_60px_rgba(234,179,8,0.20)]",
      Icon: Clock,
    },
    red: {
      bg: "bg-red-500/10 border-red-400/40",
      text: "text-red-300",
      shadow: "shadow-[0_0_60px_rgba(239,68,68,0.25)]",
      Icon: XCircle,
    },
    gold: {
      bg: "border-amber-300/45 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.22),rgba(245,158,11,0.10)_45%,rgba(0,0,0,0.18)_100%)]",
      text: "text-amber-300",
      shadow: "shadow-[0_0_80px_rgba(245,158,11,0.28)]",
      Icon: Crown,
    },
  } as const;

  const labels: Record<string, string> = {
    valid_entry: "ENTRA FREE ✓",
    gold_entry: "✦ GOLD ENTRY",
    used_qr: "QR YA USADO ✗",
    expired_qr: "QR VENCIDO ⏱",
    invalid_qr: "QR INVÁLIDO ✗",
  };

  const modeButtonClass = (value: MainMode) =>
    `flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black tracking-[0.14em] uppercase border transition ${
      mainMode === value
        ? "bg-fuchsia-600 border-fuchsia-500 text-white shadow-[0_0_25px_rgba(217,70,239,0.35)]"
        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
    }`;

  const inputModeButtonClass = (value: ScanInputMode) =>
    `flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black tracking-[0.12em] uppercase border transition ${
      scanInputMode === value
        ? "bg-fuchsia-600 border-fuchsia-500 text-white shadow-[0_0_25px_rgba(217,70,239,0.35)]"
        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
    }`;

  const renderCameraScanner = (
    onScan: (value: string) => void,
    disabledMessage?: string
  ) => {
    if (disabledMessage) {
      return (
        <div className="rounded-[28px] border border-white/10 bg-black/30 py-16 text-center">
          <p className="text-sm text-white/50">{disabledMessage}</p>
        </div>
      );
    }

    return (
      <div className="relative overflow-hidden rounded-[28px] border border-fuchsia-500/20 bg-black/80 p-2 shadow-[0_0_40px_rgba(217,70,239,0.12)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-black/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-black/70 to-transparent" />

        <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full border border-fuchsia-400/30 bg-black/45 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.3em] text-fuchsia-200 backdrop-blur">
          Área de escaneo
        </div>

        <div className="relative overflow-hidden rounded-[22px]">
          <QRScanner onScan={onScan} paused={processing} />

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-60 w-60 max-h-[65vw] max-w-[65vw] rounded-[28px] border-2 border-fuchsia-400/90 shadow-[0_0_30px_rgba(217,70,239,0.55)]">
              <div className="absolute -left-[2px] -top-[2px] h-10 w-10 rounded-tl-[28px] border-l-4 border-t-4 border-white/90" />
              <div className="absolute -right-[2px] -top-[2px] h-10 w-10 rounded-tr-[28px] border-r-4 border-t-4 border-white/90" />
              <div className="absolute -bottom-[2px] -left-[2px] h-10 w-10 rounded-bl-[28px] border-b-4 border-l-4 border-white/90" />
              <div className="absolute -bottom-[2px] -right-[2px] h-10 w-10 rounded-br-[28px] border-b-4 border-r-4 border-white/90" />
              <div className="absolute left-3 right-3 top-1/2 h-[2px] -translate-y-1/2 bg-gradient-to-r from-transparent via-fuchsia-300 to-transparent shadow-[0_0_20px_rgba(217,70,239,0.8)]" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!canUseScanner) {
    return (
      <DashboardShell title="HOLY · SCAN QR">
        <div className="mx-auto max-w-xl px-4 py-8">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-400" />
            <h1 className="mb-2 text-2xl font-bold">Sin acceso</h1>
            <p className="text-white/70">
              Esta interfaz es solo para usuarios de barra, caja o administración.
            </p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <>
      <DashboardShell title="HOLY · SCAN QR">
        <div className="mx-auto max-w-6xl space-y-4 px-4 pt-3 pb-28">
          <div className="pt-1 text-center">
            <h1 className="flex items-center justify-center gap-2 text-2xl font-black tracking-[0.2em] text-white">
              <ScanLine className="h-6 w-6 text-fuchsia-400" />
              SCAN QR
            </h1>
            <p className="mt-1 text-sm text-white/50">
              Un solo panel para entrada y barra
            </p>
          </div>

          <div className="mx-auto grid w-full max-w-4xl grid-cols-2 gap-3 md:grid-cols-4">
            <button
              type="button"
              onClick={() => setMainMode("entrada")}
              className={modeButtonClass("entrada")}
            >
              <DoorOpen className="h-4 w-4" />
              Entrada
            </button>

            <button
              type="button"
              onClick={() => setMainMode("barra")}
              className={modeButtonClass("barra")}
            >
              <Zap className="h-4 w-4" />
              Barra
            </button>

            <button
              type="button"
              onClick={() => setScanInputMode("camera")}
              className={inputModeButtonClass("camera")}
            >
              <Camera className="h-4 w-4" />
              Cámara
            </button>

            <button
              type="button"
              onClick={() => setScanInputMode("zebra")}
              className={inputModeButtonClass("zebra")}
            >
              <Usb className="h-4 w-4" />
              Zebra DS22
            </button>
          </div>

          {mainMode === "entrada" ? (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-6">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                        <DoorOpen className="h-5 w-5 text-fuchsia-400" />
                        Taquilla / Entrada
                      </h2>
                      <p className={`mt-1 text-sm ${event ? "text-white/50" : "text-red-400"}`}>
                        {event ? event.name : "⚠ Sin evento activo"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {event?.qr_entry_until && (
                        <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 px-3 py-2 text-right">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">
                            QR hasta
                          </p>
                          <p className="text-lg font-black text-fuchsia-300">
                            {new Date(event.qr_entry_until).toLocaleTimeString("es-AR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      )}

                      <button
                        onClick={() => refreshEvent?.()}
                        className="rounded-2xl border border-white/10 bg-white/5 p-3 text-white/70 transition hover:bg-white/10 hover:text-white"
                        title="Refrescar evento"
                        type="button"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Free", val: nightStats.valid, color: "text-emerald-300" },
                      { label: "Gold", val: nightStats.gold, color: "text-amber-300" },
                      { label: "Rechazos", val: nightStats.invalid, color: "text-red-300" },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="rounded-2xl border border-white/10 bg-black/25 py-4 text-center"
                      >
                        <p className={`text-3xl font-black ${s.color}`}>{s.val}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/45">
                          {s.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="mb-4 flex items-center gap-3">
                    {scanInputMode === "camera" ? (
                      <Camera className="h-5 w-5 text-fuchsia-400" />
                    ) : (
                      <Usb className="h-5 w-5 text-fuchsia-400" />
                    )}
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {scanInputMode === "camera"
                          ? "Escanear ingreso"
                          : "Escanear con Zebra DS22"}
                      </h3>
                      <p className="text-xs uppercase tracking-[0.22em] text-white/40">
                        FREE + GOLD automáticos
                      </p>
                    </div>
                  </div>

                  {scanInputMode === "camera" ? (
                    renderCameraScanner(
                      (value) => {
                        void handleUnifiedScan(value);
                      },
                      event ? undefined : "No hay evento activo"
                    )
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-[28px] border border-fuchsia-500/20 bg-gradient-to-b from-fuchsia-500/10 to-black/30 p-5 shadow-[0_0_40px_rgba(217,70,239,0.10)]">
                        <div className="mb-4 text-center">
                          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-fuchsia-200">
                            Área de lectura Zebra
                          </p>
                          <p className="mt-2 text-sm text-white/65">
                            Escaneá directo con el DS22. FREE y GOLD se validan solos.
                          </p>
                        </div>

                        <input
                          ref={zebraInputRef}
                          value={zebraBuffer}
                          onChange={(e) => handleZebraChange(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void handleZebraSubmit();
                            }
                          }}
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck={false}
                          placeholder="Esperando lectura..."
                          className="w-full rounded-2xl border border-fuchsia-400/20 bg-black/50 px-4 py-5 text-center text-lg font-semibold tracking-[0.14em] text-white outline-none placeholder:text-white/30"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={focusZebraInput}
                          className="flex min-w-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                        >
                          <Crosshair className="h-4 w-4 shrink-0" />
                          <span className="truncate">Enfocar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleZebraSubmit()}
                          disabled={!zebraBuffer.trim() || processing}
                          className="flex min-w-0 items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/15 disabled:opacity-50"
                        >
                          <CheckCircle className="h-4 w-4 shrink-0" />
                          <span className="truncate">Validar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setZebraBuffer("");
                            focusZebraInput();
                          }}
                          className="flex min-w-0 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/15"
                        >
                          <XCircle className="h-4 w-4 shrink-0" />
                          <span className="truncate">Limpiar</span>
                        </button>
                      </div>

                      <p className="text-center text-xs text-white/45">
                        El DS22 entra como teclado. Si no manda Enter, valida solo por timeout.
                      </p>
                    </div>
                  )}

                  <p className="mt-3 text-center text-[11px] uppercase tracking-[0.25em] text-white/35">
                    {!event && mainMode === "entrada"
                      ? "Scanner desactivado"
                      : processing
                        ? "Procesando QR..."
                        : scanInputMode === "camera"
                          ? "Cámara · FREE + GOLD automático"
                          : "Zebra · FREE + GOLD automático"}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Keyboard className="h-5 w-5 text-fuchsia-300" />
                    <h3 className="font-semibold">Token manual</h3>
                  </div>

                  <div className="flex gap-3">
                    <input
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      placeholder="Pegá token, URL o QR"
                      className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                    />
                    <button
                      onClick={handleManualSubmit}
                      disabled={processing || !manualToken.trim()}
                      className="rounded-xl bg-fuchsia-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
                    >
                      OK
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {!entryScanResult ? (
                  <div className="rounded-[32px] border border-white/10 bg-white/5 p-6">
                    <div className="mb-5 flex items-center gap-3">
                      <Clock className="h-8 w-8 text-white/40" />
                      <div>
                        <h2 className="text-xl font-bold">Esperando escaneo</h2>
                        <p className="text-sm text-white/50">
                          Escaneá un QR free o gold
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/40">
                        Estado actual
                      </p>
                      <p className="text-sm text-white/70">
                        {event
                          ? "Sistema listo para validar ingresos"
                          : "No hay evento activo"}
                      </p>
                    </div>
                  </div>
                ) : (() => {
                  const cfg = RC[entryScanResult.color] || RC.red;
                  const Icon = cfg.Icon;

                  return (
                    <div
                      className={`relative overflow-hidden rounded-[32px] border p-6 text-center ${cfg.bg} ${cfg.shadow}`}
                    >
                      {entryScanResult.result === "gold_entry" && (
                        <>
                          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.16),transparent_45%)]" />
                          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/80 to-transparent" />
                        </>
                      )}

                      <Icon className={`mx-auto mb-4 h-20 w-20 ${cfg.text}`} />

                      <div className={`mb-3 text-4xl font-black tracking-[0.2em] ${cfg.text}`}>
                        {labels[entryScanResult.result]}
                      </div>

                      <p className="text-xl font-bold text-white">
                        {entryScanResult.message}
                      </p>

                      {entryScanResult.rrppName && (
                        <p className="mt-2 text-sm text-white/60">
                          RRPP:{" "}
                          <span className="font-semibold text-fuchsia-300">
                            {entryScanResult.rrppName}
                          </span>
                        </p>
                      )}

                      {entryScanResult.result === "gold_entry" ? (
                        <p className="mt-2 text-sm font-semibold text-amber-200">
                          Acceso VIP confirmado ✦
                        </p>
                      ) : entryScanResult.clientPointsAdded &&
                        entryScanResult.clientPointsAdded > 0 ? (
                        <p className="mt-2 text-sm font-semibold text-emerald-300">
                          +{entryScanResult.clientPointsAdded} para el cliente
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-white/50">
                          Sin puntos extra: esta cuenta ya cobró este evento
                        </p>
                      )}

                      <p className="mt-5 text-xs text-white/35">
                        {new Date().toLocaleTimeString("es-AR")}
                      </p>
                    </div>
                  );
                })()}

                {recentEntries.length > 0 && (
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                    <p className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/45">
                      <LogIn className="h-3 w-3" />
                      Últimos ingresos
                    </p>

                    <div className="space-y-1">
                      {recentEntries.map((e) => (
                        <div
                          key={e.id}
                          className="flex items-center justify-between border-b border-white/5 py-3 last:border-0"
                        >
                          <div>
                            <p className="text-sm font-semibold text-white">{e.name}</p>
                            <p className="mt-0.5 text-xs text-white/45">{e.rrpp}</p>
                          </div>

                          <div className="text-right">
                            <p
                              className={`text-xs font-bold ${
                                e.color === "gold" ? "text-amber-300" : "text-emerald-300"
                              }`}
                            >
                              {e.color === "gold" ? "GOLD" : "FREE"}
                            </p>
                            <p className="text-[10px] text-white/40">{e.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl space-y-6">
              {!barResult ? (
                <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 shadow-[0_0_30px_rgba(0,0,0,0.18)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-500/10">
                      <Zap className="h-7 w-7 text-yellow-300" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/35">
                        Estado actual
                      </p>
                      <h2 className="mt-0.5 text-lg font-black tracking-[0.16em] text-white">
                        ESPERANDO CANJE
                      </h2>
                      <p className="mt-1 text-sm text-white/50">
                        Escaneá un QR de reward o ingresá el token manual
                      </p>
                    </div>

                    <div className="hidden rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-right md:block">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">
                        Barra
                      </p>
                      <p className="text-sm font-bold text-fuchsia-300">Ready</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className={`relative overflow-hidden rounded-[26px] border px-4 py-3 md:px-4 md:py-4 transition-all duration-300 ${
                    barResult.ok
                      ? "border-emerald-400/40 bg-emerald-500/10 shadow-[0_0_60px_rgba(16,185,129,0.16)]"
                      : "border-red-400/40 bg-red-500/10 shadow-[0_0_60px_rgba(239,68,68,0.16)]"
                  } ${
                    barFlash === "success"
                      ? "scale-[1.01] shadow-[0_0_80px_rgba(16,185,129,0.30)]"
                      : ""
                  } ${
                    barFlash === "error"
                      ? "scale-[1.01] shadow-[0_0_80px_rgba(239,68,68,0.30)]"
                      : ""
                  }`}
                >
                  {barFlash && (
                    <div
                      className={`pointer-events-none absolute inset-0 animate-pulse ${
                        barFlash === "success" ? "bg-emerald-300/10" : "bg-red-300/10"
                      }`}
                    />
                  )}

                  <div
                    className={`pointer-events-none absolute inset-y-0 left-0 w-1.5 ${
                      barResult.ok ? "bg-emerald-300" : "bg-red-300"
                    }`}
                  />

                  <div
                    className={`pointer-events-none absolute inset-0 opacity-60 ${
                      barResult.ok
                        ? "bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_40%)]"
                        : "bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.18),transparent_40%)]"
                    }`}
                  />

                  <div className="relative flex flex-col gap-3 md:flex-row md:items-center">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] border border-white/10 bg-black/20">
                      {barResult.ok ? (
                        <CheckCircle className="h-10 w-10 text-emerald-300" />
                      ) : (
                        <XCircle className="h-10 w-10 text-red-300" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/40">
                          Último resultado
                        </p>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${
                            barResult.ok
                              ? "bg-emerald-400/15 text-emerald-300"
                              : "bg-red-400/15 text-red-300"
                          }`}
                        >
                          {barResult.ok ? "Aprobado" : "Rechazado"}
                        </span>
                      </div>

                      <div
                        className={`mt-2 text-2xl font-black tracking-[0.22em] md:text-3xl ${
                          barResult.ok ? "text-emerald-300" : "text-red-300"
                        }`}
                      >
                        {barResult.ok ? "CANJE OK" : "CANJE FALLIDO"}
                      </div>

                      <p className="mt-2 truncate text-lg font-bold text-white md:text-xl">
                        {barResult.ok ? getNiceRewardName(barResult) : barResult.message}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {typeof barResult.new_balance === "number" && (
                          <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/75">
                            Saldo nuevo:{" "}
                            <span className="font-black text-fuchsia-300">
                              {barResult.new_balance}
                            </span>
                          </div>
                        )}

                        {!!barResult.short_token && (
                          <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/75">
                            Token:{" "}
                            <span className="font-black text-fuchsia-300">
                              {barResult.short_token}
                            </span>
                          </div>
                        )}

                        {!!barResult.code && !barResult.ok && (
                          <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/75">
                            Code:{" "}
                            <span className="font-black text-red-300">{barResult.code}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">
                          Hora
                        </p>
                        <p className="mt-1 text-sm font-bold text-white/70">
                          {new Date().toLocaleTimeString("es-AR", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="mb-4 flex items-center gap-3">
                  {scanInputMode === "camera" ? (
                    <Camera className="h-5 w-5 text-fuchsia-400" />
                  ) : (
                    <Usb className="h-5 w-5 text-fuchsia-400" />
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-white">Barra / Canjes</h2>
                    <p className="text-xs uppercase tracking-[0.22em] text-white/40">
                      Reward scanner
                    </p>
                  </div>
                </div>

                {scanInputMode === "camera" ? (
                  renderCameraScanner((value) => {
                    void handleUnifiedScan(value);
                  })
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-[28px] border border-fuchsia-500/20 bg-gradient-to-b from-fuchsia-500/10 to-black/30 p-5 shadow-[0_0_40px_rgba(217,70,239,0.10)]">
                      <div className="mb-4 text-center">
                        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-fuchsia-200">
                          Área de canje Zebra
                        </p>
                        <p className="mt-2 text-sm text-white/65">
                          Escaneá el QR de reward para confirmar el canje.
                        </p>
                      </div>

                      <input
                        ref={zebraInputRef}
                        value={zebraBuffer}
                        onChange={(e) => handleZebraChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void handleZebraSubmit();
                          }
                        }}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        placeholder="Esperando lectura..."
                        className="w-full rounded-2xl border border-fuchsia-400/20 bg-black/50 px-4 py-5 text-center text-lg font-semibold tracking-[0.14em] text-white outline-none placeholder:text-white/30"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={focusZebraInput}
                        className="flex min-w-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                      >
                        <Crosshair className="h-4 w-4 shrink-0" />
                        <span className="truncate">Enfocar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleZebraSubmit()}
                        disabled={!zebraBuffer.trim() || processing}
                        className="flex min-w-0 items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/15 disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4 shrink-0" />
                        <span className="truncate">Validar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setZebraBuffer("");
                          focusZebraInput();
                        }}
                        className="flex min-w-0 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/15"
                      >
                        <XCircle className="h-4 w-4 shrink-0" />
                        <span className="truncate">Limpiar</span>
                      </button>
                    </div>

                    <p className="text-center text-xs text-white/45">
                      El DS22 entra como teclado. Si no manda Enter, valida solo por timeout.
                    </p>
                  </div>
                )}

                <p className="mt-3 text-center text-[11px] uppercase tracking-[0.25em] text-white/35">
                  {processing
                    ? "Procesando canje..."
                    : scanInputMode === "camera"
                      ? "Cámara · modo barra activo"
                      : "Zebra · modo barra activo"}
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Keyboard className="h-5 w-5 text-fuchsia-300" />
                  <h2 className="font-semibold">Token manual</h2>
                </div>

                <div className="flex gap-3">
                  <input
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="Pegá token, URL o QR"
                    className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                  />
                  <button
                    onClick={handleManualSubmit}
                    disabled={processing || !manualToken.trim()}
                    className="rounded-xl bg-fuchsia-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
                  >
                    OK
                  </button>
                </div>

                {lastBarToken && (
                  <p className="mt-3 text-xs text-white/45">
                    Último token leído:{" "}
                    <span className="text-fuchsia-300">{lastBarToken}</span>
                  </p>
                )}
              </div>

              {recentBarScans.length > 0 && (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/45">
                    <ScanLine className="h-3 w-3" />
                    Últimos canjes
                  </p>

                  <div className="space-y-1">
                    {recentBarScans.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between border-b border-white/5 py-3 last:border-0"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">{item.title}</p>
                          <p className="mt-0.5 text-xs text-white/45">{item.detail}</p>
                        </div>

                        <div className="text-right">
                          <p
                            className={`text-xs font-bold ${
                              item.status === "ok" ? "text-emerald-300" : "text-red-300"
                            }`}
                          >
                            {item.status === "ok" ? "OK" : "ERROR"}
                          </p>
                          <p className="text-[10px] text-white/40">{item.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DashboardShell>

      <ScanResultModal
        open={modalState.open}
        status={modalState.status}
        title={modalState.title}
        message={modalState.message}
        detail={modalState.detail}
        onClose={() => {
          clearModalCloseTimeout();
          setModalState((prev) => ({ ...prev, open: false }));
        }}
      />
    </>
  );
}