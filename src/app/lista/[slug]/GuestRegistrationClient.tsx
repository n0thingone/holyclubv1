"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { generateQrToken, formatTime, formatDate } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";
import {
  Zap,
  Clock,
  UserCheck,
  AlertCircle,
  LogIn,
  Sparkles,
  Download,
  Home,
} from "lucide-react";
import type { Event, RrppProfile } from "@/types";

interface Props {
  rrpp: (RrppProfile & { profiles?: { full_name: string } }) | null;
  event: Event | null;
  isRegistrationOpen: boolean;
}

interface FormData {
  first_name: string;
  last_name: string;
  dni_last3: string;
}

interface RegistrationResult {
  qr_token: string;
  first_name: string;
  last_name: string;
  linked_to_account: boolean;
}

export default function GuestRegistrationClient({
  rrpp,
  event,
  isRegistrationOpen,
}: Props) {
  const supabase = getSupabaseClient();
  const qrWrapRef = useRef<HTMLDivElement | null>(null);

  const [form, setForm] = useState<FormData>({
    first_name: "",
    last_name: "",
    dni_last3: "",
  });

  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [result, setResult] = useState<RegistrationResult | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    let alive = true;

    supabase.auth.getUser().then(({ data, error }) => {
      if (!alive) return;

      if (error) {
        console.error("No se pudo obtener el usuario actual:", error);
        setAuthLoading(false);
        return;
      }

      const user = data.user ?? null;
      setUserId(user?.id ?? null);
      setUserEmail(user?.email ?? "");
      setAuthLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [supabase]);

  const isLogged = useMemo(() => !!userId, [userId]);

  function goToLogin() {
    if (typeof window === "undefined") return;

    const next = encodeURIComponent(
      window.location.pathname + window.location.search
    );

    window.location.href = `/login?next=${next}&redirect=${next}`;
  }

  function goToDashboard() {
    if (typeof window === "undefined") return;
    window.location.href = "/dashboard/puntos/movimientos?tab=entradas";
  }

  async function getQrPngBlob(): Promise<Blob | null> {
    const svg = qrWrapRef.current?.querySelector("svg");
    if (!svg) return null;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);

    const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });

    const url = URL.createObjectURL(svgBlob);

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("No se pudo cargar el QR"));
        img.src = url;
      });

      const canvas = document.createElement("canvas");
      const size = 900;
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 80, 80, size - 160, size - 160);

      return await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/png", 1);
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function saveQrImage() {
    if (!result || typeof window === "undefined") return;

    setSaveMessage("");

    try {
      const blob = await getQrPngBlob();

      if (!blob) {
        setSaveMessage("No se pudo generar la imagen. Sacá captura del QR.");
        return;
      }

      const file = new File(
        [blob],
        `holy-qr-${result.first_name}-${result.last_name}.png`,
        { type: "image/png" }
      );

      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
        share?: (data: ShareData) => Promise<void>;
      };

      if (
        nav.share &&
        nav.canShare &&
        nav.canShare({
          files: [file],
        } as ShareData)
      ) {
        await nav.share({
          title: "Holy Club — Mi QR de entrada",
          text: `QR de ingreso para ${result.first_name} ${result.last_name}`,
          files: [file],
        } as ShareData);

        setSaveMessage("Listo. Desde el menú podés guardarlo en Fotos/Galería.");
        return;
      }

      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(downloadUrl);

      setSaveMessage("QR descargado. En celular, también podés sacar captura.");
    } catch (err) {
      console.error("Error guardando QR:", err);
      setSaveMessage("No se pudo guardar. Sacá captura del QR por seguridad.");
    }
  }

  if (!rrpp) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-danger opacity-50" />
          <h1 className="font-display text-xl font-bold text-white mb-2">
            Enlace no válido
          </h1>
          <p className="text-text-muted">
            Este enlace no existe o fue desactivado
          </p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-dvh bg-background mesh-bg flex items-center justify-center px-4">
        <style jsx global>{animationStyles}</style>

        <div className="text-center space-y-4 animate-holy-pop">
          <div className="holy-logo-pulse w-16 h-16 rounded-2xl bg-gradient-purple mx-auto flex items-center justify-center shadow-purple">
            <Zap className="w-8 h-8 text-black" fill="black" />
          </div>
          <h1 className="font-display text-2xl font-black tracking-widest text-white holy-glow-text">
            HOLY CLUB
          </h1>
          <p className="text-text-muted">No hay evento activo esta noche</p>
          <p className="text-text-muted text-sm">
            Te invitó:{" "}
            <span className="text-accent-purple font-semibold">
              {rrpp.display_name}
            </span>
          </p>
        </div>
      </div>
    );
  }

  if (!isRegistrationOpen) {
    return (
      <div className="min-h-dvh bg-background mesh-bg flex items-center justify-center px-4">
        <style jsx global>{animationStyles}</style>

        <div className="text-center space-y-4 animate-holy-pop">
          <Clock className="w-16 h-16 mx-auto text-warning opacity-70" />
          <h1 className="font-display text-2xl font-black tracking-widest text-white">
            REGISTROS CERRADOS
          </h1>
          <p className="text-text-muted">El horario de registro ha finalizado</p>
          <p className="text-text-muted text-sm">
            Presentate en la puerta y aboná la entrada
          </p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rrpp || !event) return;

    setLoading(true);
    setError("");
    setSaveMessage("");

    if (!/^\d{3}$/.test(form.dni_last3)) {
      setError("Los últimos 3 dígitos del DNI deben ser números");
      setLoading(false);
      return;
    }

    const qrToken = generateQrToken();

    const payload = {
      event_id: event.id,
      rrpp_id: rrpp.id,
      user_id: userId,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      dni_last3: form.dni_last3,
      qr_token: qrToken,
      registration_status: "registered" as const,
      entry_points_awarded: false,
    };

    const { error: insertError } = await (supabase as any)
      .from("guest_registrations")
      .insert(payload);

    if (insertError) {
      console.error("Error insertando invitado:", insertError);
      setError("Error al registrarte. Intentá de nuevo.");
      setLoading(false);
      return;
    }

    setResult({
      qr_token: qrToken,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      linked_to_account: !!userId,
    });

    setLoading(false);
  }

  if (result) {
    return (
      <div className="min-h-dvh bg-background mesh-bg flex flex-col items-center justify-start px-4 pt-2 pb-[calc(70px+env(safe-area-inset-bottom))] animate-fade-in">
        <style jsx global>{animationStyles}</style>

        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="holy-orb holy-orb-a" />
          <div className="holy-orb holy-orb-b" />
        </div>

        <div className="w-full max-w-sm space-y-2 text-center relative z-10">
          <div className="animate-holy-drop">
            <div className="holy-logo-pulse inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-purple shadow-purple mb-2">
              <Zap className="w-5 h-5 text-black" fill="black" />
            </div>
            <h1 className="font-display text-lg font-black tracking-widest text-white holy-glow-text">
              HOLY CLUB
            </h1>
          </div>

          <div className="holy-card animate-holy-pop holy-success-card">
            <div className="flex items-center gap-2 justify-center mb-3">
              <UserCheck className="w-4 h-4 text-success animate-holy-tick" />
              <span className="text-success font-semibold text-sm">
                Registrado exitosamente
              </span>
            </div>

            <p className="font-display text-xl font-black tracking-wide text-white mb-1">
              {result.first_name} {result.last_name}
            </p>

            <p className="text-text-muted text-xs mb-2">
              Invitado por{" "}
              <span className="text-accent-purple font-semibold">
                {rrpp.display_name}
              </span>
            </p>

            {result.linked_to_account ? (
              <div className="mb-3 rounded-xl border border-success/25 bg-success/10 px-3 py-2 holy-soft-pulse">
                <p className="text-success text-xs font-semibold flex items-center justify-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Vinculado a tu cuenta
                </p>
                <p className="text-text-muted text-[11px] mt-0.5">
                  Tu ingreso queda asociado a tu usuario.
                </p>
              </div>
            ) : (
              <div className="mb-3 rounded-xl border border-border bg-background/50 px-3 py-2">
                <p className="text-text-muted text-xs font-semibold">
                  Registro sin cuenta
                </p>
                <p className="text-text-muted text-[11px] mt-0.5">
                  El QR funciona igual, pero no suma beneficios de cuenta.
                </p>
              </div>
            )}

            <div className="relative inline-block">
              <div className="holy-qr-glow absolute inset-0 rounded-3xl" />
              <div
                ref={qrWrapRef}
                className="relative bg-white rounded-2xl p-3 inline-block mx-auto mb-1 shadow-purple animate-holy-qr"
              >
                <QRCodeSVG
                  value={result.qr_token}
                  size={170}
                  level="H"
                  includeMargin={false}
                />
              </div>
            </div>

            <p className="text-text-muted text-[10px] tracking-widest uppercase mb-1">
              Mostrá este QR en la puerta
            </p>

            <p className="font-mono text-[10px] text-text-muted/45 break-all">
              {result.qr_token}
            </p>

            <div className="mt-3 bg-background/50 rounded-xl p-2.5 holy-event-mini">
              <p className="font-display text-sm font-bold text-white">
                {event.name}
              </p>
              <p className="text-text-muted text-[11px] mt-0.5">
                {formatDate(event.event_date)}
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <Clock className="w-3 h-3 text-warning" />
                <p className="text-warning text-[11px]">
                  QR válido hasta {formatTime(event.qr_entry_until)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 animate-holy-rise">
            <button onClick={saveQrImage} className="holy-btn-primary w-full holy-shimmer-btn">
              <Download className="w-4 h-4 inline-block mr-2" />
              GUARDAR QR
            </button>

            {isLogged ? (
              <button
                type="button"
                onClick={goToDashboard}
                className="holy-btn-secondary w-full holy-secondary-glow"
              >
                <Home className="w-4 h-4 inline-block mr-2" />
                VER MIS QR
              </button>
            ) : (
              <button
                type="button"
                onClick={goToLogin}
                className="holy-btn-secondary w-full holy-secondary-glow"
              >
                <LogIn className="w-4 h-4 inline-block mr-2" />
                INICIAR SESIÓN
              </button>
            )}

            {saveMessage && (
              <p className="text-warning text-xs px-3">{saveMessage}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background mesh-bg flex flex-col items-center justify-start px-4 pt-5 pb-[calc(90px+env(safe-area-inset-bottom))]">
      <style jsx global>{animationStyles}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="holy-orb holy-orb-a" />
        <div className="holy-orb holy-orb-b" />
      </div>

      <div className="w-full max-w-sm space-y-4 animate-slide-up relative z-10">
        <div className="text-center animate-holy-drop">
          <div className="holy-logo-pulse inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-purple shadow-purple mb-3">
            <Zap className="w-6 h-6 text-black" fill="black" />
          </div>
          <h1 className="font-display text-2xl font-black tracking-widest text-white holy-glow-text">
            HOLY CLUB
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Lista de{" "}
            <span className="text-accent-purple font-semibold">
              {rrpp.display_name}
            </span>
          </p>
        </div>

        <div className="holy-card bg-gradient-card animate-holy-rise holy-event-card">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-success animate-ping" />
            <span className="text-success text-xs font-semibold uppercase tracking-widest">
              Lista Free Activa
            </span>
          </div>

          <p className="font-display text-lg font-bold text-white">
            {event.name}
          </p>

          <p className="text-text-muted text-sm">
            {formatDate(event.event_date)}
          </p>

          <div className="flex items-center gap-1.5 mt-2">
            <Clock className="w-3.5 h-3.5 text-warning" />
            <p className="text-warning text-xs">
              Registro hasta las {formatTime(event.registration_until)}
            </p>
          </div>
        </div>

        <div className="holy-card animate-holy-rise">
          {authLoading ? (
            <div className="rounded-xl border border-border bg-background/40 px-3 py-2 mb-3">
              <p className="text-text-muted text-sm">Verificando cuenta…</p>
            </div>
          ) : isLogged ? (
            <div className="rounded-xl border border-success/25 bg-success/10 px-3 py-2 mb-3 holy-soft-pulse">
              <p className="text-success text-xs font-semibold flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                Con tu cuenta
              </p>
              <p className="text-text-muted text-[11px] mt-0.5 truncate">
                {userEmail || "Usuario autenticado"}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/10 px-3 py-2 mb-3">
              <p className="text-white text-sm font-semibold">
                Estás anotándote sin cuenta
              </p>
              <p className="text-text-muted text-xs mt-1 mb-2">
                El QR funciona igual. Si querés sumar beneficios, iniciá sesión.
              </p>
              <button
                type="button"
                onClick={goToLogin}
                className="holy-btn-secondary w-full holy-secondary-glow"
              >
                <LogIn className="w-4 h-4 inline-block mr-2" />
                TENGO CUENTA / INICIAR SESIÓN
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="holy-label">Nombre</label>
              <input
                className="holy-input holy-input-focus"
                placeholder="Juan"
                value={form.first_name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, first_name: e.target.value }))
                }
                required
                autoComplete="given-name"
              />
            </div>

            <div>
              <label className="holy-label">Apellido</label>
              <input
                className="holy-input holy-input-focus"
                placeholder="García"
                value={form.last_name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, last_name: e.target.value }))
                }
                required
                autoComplete="family-name"
              />
            </div>

            <div>
              <label className="holy-label">Últimos 3 dígitos del DNI</label>
              <input
                className="holy-input holy-input-focus text-center text-2xl tracking-[0.5em] font-display"
                placeholder="· · ·"
                value={form.dni_last3}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 3);
                  setForm((prev) => ({ ...prev, dni_last3: val }));
                }}
                inputMode="numeric"
                maxLength={3}
                required
              />
              <p className="text-text-muted text-xs mt-1">
                Solo los últimos 3 números de tu DNI
              </p>
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-danger text-sm animate-holy-pop">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="holy-btn-primary mt-2 w-full holy-shimmer-btn disabled:opacity-70"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Registrando...
                </span>
              ) : isLogged ? (
                "ANOTARME CON MI CUENTA ✓"
              ) : (
                "ANOTARME FREE ✓"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-text-muted text-xs animate-holy-rise">
          Al registrarte aceptás las condiciones del evento.
        </p>
      </div>
    </div>
  );
}

const animationStyles = `
  @keyframes holyDrop {
    0% {
      opacity: 0;
      transform: translateY(-10px) scale(0.98);
      filter: blur(6px);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
      filter: blur(0);
    }
  }

  @keyframes holyRise {
    0% {
      opacity: 0;
      transform: translateY(16px) scale(0.98);
      filter: blur(5px);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
      filter: blur(0);
    }
  }

  @keyframes holyPop {
    0% {
      opacity: 0;
      transform: scale(0.94);
      filter: blur(4px);
    }
    70% {
      opacity: 1;
      transform: scale(1.015);
      filter: blur(0);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes holyLogoPulse {
    0%, 100% {
      box-shadow:
        0 0 18px rgba(217,70,239,0.28),
        0 0 42px rgba(168,85,247,0.10);
      transform: translateY(0) scale(1);
    }
    50% {
      box-shadow:
        0 0 28px rgba(217,70,239,0.46),
        0 0 65px rgba(168,85,247,0.18);
      transform: translateY(-1px) scale(1.025);
    }
  }

  @keyframes holySoftPulse {
    0%, 100% {
      box-shadow: 0 0 0 rgba(16,185,129,0.0);
    }
    50% {
      box-shadow: 0 0 22px rgba(16,185,129,0.10);
    }
  }

  @keyframes holyQr {
    0% {
      opacity: 0;
      transform: scale(0.88) rotate(-1deg);
    }
    70% {
      opacity: 1;
      transform: scale(1.025) rotate(0deg);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes holyQrGlow {
    0%, 100% {
      opacity: 0.35;
      box-shadow:
        0 0 22px rgba(217,70,239,0.22),
        0 0 45px rgba(168,85,247,0.10);
    }
    50% {
      opacity: 1;
      box-shadow:
        0 0 34px rgba(217,70,239,0.38),
        0 0 70px rgba(168,85,247,0.18);
    }
  }

  @keyframes holyShimmer {
    0% {
      transform: translateX(-130%) skewX(-18deg);
    }
    100% {
      transform: translateX(180%) skewX(-18deg);
    }
  }

  @keyframes holyTick {
    0%, 100% {
      transform: scale(1);
      filter: drop-shadow(0 0 0 rgba(16,185,129,0));
    }
    50% {
      transform: scale(1.15);
      filter: drop-shadow(0 0 10px rgba(16,185,129,0.55));
    }
  }

  @keyframes holyOrbFloat {
    0%, 100% {
      transform: translate3d(0,0,0) scale(1);
      opacity: 0.38;
    }
    50% {
      transform: translate3d(10px,-18px,0) scale(1.08);
      opacity: 0.65;
    }
  }

  .animate-holy-drop {
    animation: holyDrop 0.55s ease-out both;
  }

  .animate-holy-rise {
    animation: holyRise 0.65s ease-out both;
  }

  .animate-holy-pop {
    animation: holyPop 0.55s ease-out both;
  }

  .holy-logo-pulse {
    animation: holyLogoPulse 2.8s ease-in-out infinite;
  }

  .holy-glow-text {
    text-shadow:
      0 0 18px rgba(217,70,239,0.35),
      0 0 34px rgba(168,85,247,0.18);
  }

  .holy-soft-pulse {
    animation: holySoftPulse 2.4s ease-in-out infinite;
  }

  .animate-holy-qr {
    animation: holyQr 0.6s ease-out both;
  }

  .holy-qr-glow {
    animation: holyQrGlow 2.5s ease-in-out infinite;
  }

  .animate-holy-tick {
    animation: holyTick 1.7s ease-in-out infinite;
  }

  .holy-shimmer-btn {
    position: relative;
    overflow: hidden;
  }

  .holy-shimmer-btn::after {
    content: "";
    position: absolute;
    top: -40%;
    left: 0;
    height: 180%;
    width: 42%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255,255,255,0.35),
      transparent
    );
    animation: holyShimmer 2.9s ease-in-out infinite;
    pointer-events: none;
  }

  .holy-shimmer-btn > * {
    position: relative;
    z-index: 1;
  }

  .holy-secondary-glow {
    transition:
      transform 0.18s ease,
      box-shadow 0.18s ease,
      border-color 0.18s ease;
  }

  .holy-secondary-glow:active {
    transform: scale(0.985);
  }

  .holy-secondary-glow:hover {
    box-shadow: 0 0 22px rgba(217,70,239,0.16);
    border-color: rgba(217,70,239,0.28);
  }

  .holy-input-focus {
    transition:
      border-color 0.18s ease,
      box-shadow 0.18s ease,
      background 0.18s ease;
  }

  .holy-input-focus:focus {
    box-shadow:
      0 0 0 1px rgba(217,70,239,0.28),
      0 0 24px rgba(217,70,239,0.12);
  }

  .holy-event-card {
    box-shadow:
      inset 0 0 0 1px rgba(255,255,255,0.03),
      0 0 30px rgba(217,70,239,0.06);
  }

  .holy-event-mini {
    box-shadow: inset 0 0 24px rgba(217,70,239,0.03);
  }

  .holy-success-card {
    box-shadow:
      0 0 38px rgba(217,70,239,0.12),
      inset 0 0 0 1px rgba(255,255,255,0.03);
  }

  .holy-orb {
    position: absolute;
    border-radius: 9999px;
    filter: blur(44px);
    animation: holyOrbFloat 5.2s ease-in-out infinite;
  }

  .holy-orb-a {
    width: 180px;
    height: 180px;
    top: 4%;
    right: -70px;
    background: rgba(217,70,239,0.18);
  }

  .holy-orb-b {
    width: 160px;
    height: 160px;
    bottom: 12%;
    left: -80px;
    background: rgba(168,85,247,0.12);
    animation-delay: 1.2s;
  }
`;