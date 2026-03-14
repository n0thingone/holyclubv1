"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { generateQrToken, formatTime, formatDate } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";
import { Zap, Clock, UserCheck, AlertCircle, Share2 } from "lucide-react";
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
}

export default function GuestRegistrationClient({
  rrpp,
  event,
  isRegistrationOpen,
}: Props) {
  const [form, setForm] = useState<FormData>({
    first_name: "",
    last_name: "",
    dni_last3: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const supabase = getSupabaseClient();

  if (!rrpp) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-danger opacity-50" />
          <h1 className="font-display text-xl font-bold text-white mb-2">
            Enlace no válido
          </h1>
          <p className="text-text-muted">Este enlace no existe o fue desactivado</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-dvh bg-background mesh-bg flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-purple mx-auto flex items-center justify-center shadow-purple">
            <Zap className="w-8 h-8 text-black" fill="black" />
          </div>
          <h1 className="font-display text-2xl font-black tracking-widest text-white">
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
        <div className="text-center space-y-4">
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

    if (!/^\d{3}$/.test(form.dni_last3)) {
      setError("Los últimos 3 dígitos del DNI deben ser números");
      setLoading(false);
      return;
    }

    const qrToken = generateQrToken();

    const { error: insertError } = await supabase
      .from("guest_registrations")
      .insert({
        event_id: event.id,
        rrpp_id: rrpp.id,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        dni_last3: form.dni_last3,
        qr_token: qrToken,
        registration_status: "registered",
      });

    if (insertError) {
      setError("Error al registrarte. Intentá de nuevo.");
      setLoading(false);
      return;
    }

    setResult({
      qr_token: qrToken,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
    });
    setLoading(false);
  }

  async function shareQr() {
    if (!result || typeof navigator === "undefined" || !("share" in navigator)) {
      return;
    }

    try {
      await (navigator as Navigator & {
        share: (data: ShareData) => Promise<void>;
      }).share({
        title: "Holy Club — Mi QR de entrada",
        text: `QR de ingreso para ${result.first_name} ${result.last_name}`,
        url: window.location.href,
      });
    } catch (err) {
      console.error("Error sharing QR:", err);
    }
  }

  if (result) {
    return (
      <div className="min-h-dvh bg-background mesh-bg flex flex-col items-center justify-center px-4 py-8 animate-fade-in">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-purple shadow-purple mb-3">
              <Zap className="w-6 h-6 text-black" fill="black" />
            </div>
            <h1 className="font-display text-xl font-black tracking-widest text-white">
              HOLY CLUB
            </h1>
          </div>

          <div className="holy-card animate-scale-in">
            <div className="flex items-center gap-2 justify-center mb-4">
              <UserCheck className="w-5 h-5 text-success" />
              <span className="text-success font-semibold text-sm">
                Registrado exitosamente
              </span>
            </div>

            <p className="font-display text-2xl font-black tracking-wide text-white mb-1">
              {result.first_name} {result.last_name}
            </p>
            <p className="text-text-muted text-sm mb-6">
              Invitado por{" "}
              <span className="text-accent-purple font-semibold">
                {rrpp.display_name}
              </span>
            </p>

            <div className="bg-white rounded-2xl p-5 inline-block mx-auto mb-4 shadow-purple">
              <QRCodeSVG
                value={result.qr_token}
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>

            <p className="text-text-muted text-xs tracking-widest uppercase mb-2">
              Mostra este QR en la puerta
            </p>
            <p className="font-mono text-xs text-text-muted/50">
              {result.qr_token}
            </p>

            <div className="mt-4 bg-background/50 rounded-xl p-3">
              <p className="font-display text-sm font-bold text-white">
                {event.name}
              </p>
              <p className="text-text-muted text-xs mt-0.5">
                {formatDate(event.event_date)}
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-1.5">
                <Clock className="w-3 h-3 text-warning" />
                <p className="text-warning text-xs">
                  QR válido hasta {formatTime(event.qr_entry_until)}
                </p>
              </div>
            </div>
          </div>

          <button onClick={shareQr} className="holy-btn-secondary">
            <Share2 className="w-4 h-4 inline-block mr-2" />
            COMPARTIR QR
          </button>

          <p className="text-text-muted text-xs">
            Guardá una captura de pantalla de tu QR
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background mesh-bg flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6 animate-slide-up">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-purple shadow-purple mb-4">
            <Zap className="w-7 h-7 text-black" fill="black" />
          </div>
          <h1 className="font-display text-3xl font-black tracking-widest text-white glow-text">
            HOLY CLUB
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Lista de{" "}
            <span className="text-accent-purple font-semibold">
              {rrpp.display_name}
            </span>
          </p>
        </div>

        <div className="holy-card bg-gradient-card">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-success text-xs font-semibold uppercase tracking-widest">
              Lista Free Activa
            </span>
          </div>
          <p className="font-display text-lg font-bold text-white">
            {event.name}
          </p>
          <p className="text-text-muted text-sm">{formatDate(event.event_date)}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <Clock className="w-3.5 h-3.5 text-warning" />
            <p className="text-warning text-xs">
              Registro hasta las {formatTime(event.registration_until)}
            </p>
          </div>
        </div>

        <div className="holy-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="holy-label">Nombre</label>
              <input
                className="holy-input"
                placeholder="Juan"
                value={form.first_name}
                onChange={(e) =>
                  setForm({ ...form, first_name: e.target.value })
                }
                required
                autoComplete="given-name"
              />
            </div>

            <div>
              <label className="holy-label">Apellido</label>
              <input
                className="holy-input"
                placeholder="García"
                value={form.last_name}
                onChange={(e) =>
                  setForm({ ...form, last_name: e.target.value })
                }
                required
                autoComplete="family-name"
              />
            </div>

            <div>
              <label className="holy-label">Últimos 3 dígitos del DNI</label>
              <input
                className="holy-input text-center text-2xl tracking-[0.5em] font-display"
                placeholder="· · ·"
                value={form.dni_last3}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 3);
                  setForm({ ...form, dni_last3: val });
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
              <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-danger text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="holy-btn-primary mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Registrando...
                </span>
              ) : (
                "ANOTARME FREE ✓"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-text-muted text-xs">
          Al registrarte aceptás las condiciones del evento
        </p>
      </div>
    </div>
  );
}