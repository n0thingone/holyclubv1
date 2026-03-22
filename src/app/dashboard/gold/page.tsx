"use client";

import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useActiveEvent } from "@/hooks/useActiveEvent";
import { QRCodeSVG } from "qrcode.react";
import { Crown, Copy, Check, Share2 } from "lucide-react";
import { generateQrToken } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import type { GoldQr } from "@/types";

export default function GoldPage() {
  const [qrs, setQrs] = useState<GoldQr[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [title, setTitle] = useState("GOLD ENTRY");
  const [maxUses, setMaxUses] = useState(10);
  const [expiresAt, setExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);

  const { event } = useActiveEvent();
  const { profile } = useAuth();
  const supabase = getSupabaseClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  useEffect(() => {
    fetchQrs();
  }, []);

  async function fetchQrs() {
    setLoading(true);

    const { data } = await supabase
      .from("gold_qrs")
      .select("*")
      .order("created_at", { ascending: false });

    setQrs((data as GoldQr[]) || []);
    setLoading(false);
  }

  function getQrLink(token: string) {
    return `${appUrl}/entrada/${token}`;
  }

  async function copyLink(token: string, id: string) {
    await navigator.clipboard.writeText(getQrLink(token));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function shareWhatsApp(token: string, title: string) {
    const link = getQrLink(token);
    const text = encodeURIComponent(`✦ QR GOLD — ${title}\n${link}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  function formatDateTime(value?: string | null) {
    if (!value) return "Sin vencimiento";
    return new Date(value).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function isExpired(value?: string | null) {
    if (!value) return false;
    return new Date(value).getTime() < Date.now();
  }

  async function handleCreate() {
    if (!event?.id) {
      alert("No hay evento activo");
      return;
    }

    if (!title.trim()) {
      alert("Poné un nombre para el QR");
      return;
    }

    if (maxUses < 1) {
      alert("La cantidad de usos debe ser mayor a 0");
      return;
    }

    try {
      setCreating(true);

      const token = generateQrToken();

      const payload = {
        event_id: event.id,
        title: title.trim(),
        qr_token: token,
        max_uses: maxUses,
        created_by: profile?.id || null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      };

      const { error } = await supabase.from("gold_qrs").insert(payload);

      if (error) throw error;

      setTitle("GOLD ENTRY");
      setMaxUses(10);
      setExpiresAt("");

      await fetchQrs();
    } catch (err: any) {
      alert(err?.message || "No se pudo crear el QR Gold");
    } finally {
      setCreating(false);
    }
  }

  const statusColor = (s: string, expired?: boolean) =>
    expired
      ? "text-red-400 border-red-400/30 bg-red-400/10"
      : s === "active"
        ? "text-success border-success/30 bg-success/10"
        : s === "exhausted"
          ? "text-gold border-gold/30 bg-gold/10"
          : "text-text-muted border-border bg-background";

  const statusLabel = (s: string, expired?: boolean) =>
    expired
      ? "VENCIDO"
      : s === "active"
        ? "ACTIVO"
        : s === "exhausted"
          ? "AGOTADO"
          : s.toUpperCase();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-2 border-accent-purple/30 border-t-accent-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-5 animate-fade-in max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <Crown className="w-6 h-6 text-gold" />
        <div>
          <h1 className="font-display text-2xl font-black tracking-widest text-white">
            QR GOLD
          </h1>
          <p className="text-text-muted text-sm">{qrs.length} creados</p>
        </div>
      </div>

      {event && (
        <div className="holy-card space-y-4">
          <div>
            <h2 className="font-display text-sm font-bold text-gold tracking-widest">
              ✦ CREAR QR GOLD
            </h2>
            <p className="text-text-muted text-xs">
              Generá accesos con nombre, cantidad de usos y horario límite
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="holy-label">Título / Alias</label>
              <input
                className="holy-input"
                placeholder="Ej: GOLD ENTRY / Amigos Belu / Fran amigo"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="holy-label">Usos máximos</label>
              <input
                type="number"
                className="holy-input"
                placeholder="Cantidad de usos"
                value={maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value))}
                min={1}
              />
            </div>

            <div>
              <label className="holy-label">Válido hasta</label>
              <input
                type="datetime-local"
                className="holy-input"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
              <p className="text-text-muted text-xs mt-1">
                Opcional. Si no ponés nada, queda sin vencimiento.
              </p>
            </div>

            <button
              onClick={handleCreate}
              disabled={creating}
              className="holy-btn-primary w-full"
            >
              {creating ? "GENERANDO..." : "GENERAR QR GOLD"}
            </button>
          </div>
        </div>
      )}

      {!event && (
        <div className="holy-card text-center py-6">
          <p className="text-text-muted text-sm">
            No hay evento activo para crear QR Gold
          </p>
        </div>
      )}

      {qrs.length === 0 ? (
        <div className="holy-card text-center py-12">
          <Crown className="w-12 h-12 mx-auto mb-3 text-gold opacity-30" />
          <p className="text-text-muted text-sm">No hay QR Gold creados aún</p>
        </div>
      ) : (
        <div className="space-y-3">
          {qrs.map((qr) => {
            const expired = isExpired((qr as any).expires_at);

            return (
              <div key={qr.id} className="holy-card">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-display text-sm font-bold text-white tracking-wider">
                      {qr.title}
                    </h3>
                    <p className="text-text-muted text-xs mt-0.5">
                      {new Date(qr.created_at).toLocaleDateString("es-AR")} ·{" "}
                      {qr.used_count}/{qr.max_uses} usos
                    </p>
                    <p className="text-text-muted text-xs mt-1">
                      {expired
                        ? `Venció: ${formatDateTime((qr as any).expires_at)}`
                        : `Válido hasta: ${formatDateTime((qr as any).expires_at)}`}
                    </p>
                  </div>

                  <span
                    className={`text-xs border px-2 py-1 rounded-lg font-semibold ${statusColor(
                      qr.status,
                      expired
                    )}`}
                  >
                    {statusLabel(qr.status, expired)}
                  </span>
                </div>

                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => copyLink(qr.qr_token, qr.id)}
                    className="flex-1 holy-btn-secondary py-2 text-xs flex items-center justify-center gap-1.5"
                  >
                    {copiedId === qr.id ? (
                      <Check className="w-3.5 h-3.5 text-success" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {copiedId === qr.id ? "Copiado" : "Copiar link"}
                  </button>

                  <button
                    onClick={() => shareWhatsApp(qr.qr_token, qr.title)}
                    className="flex-1 holy-btn-secondary py-2 text-xs flex items-center justify-center gap-1.5 text-success border-success/30 hover:border-success"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    WhatsApp
                  </button>

                  <button
                    onClick={() =>
                      setExpandedId(expandedId === qr.id ? null : qr.id)
                    }
                    className="holy-btn-secondary py-2 px-3 text-xs"
                  >
                    QR
                  </button>
                </div>

                {expandedId === qr.id && (
                  <div className="flex flex-col items-center py-4 bg-white rounded-2xl">
                    <QRCodeSVG
                      value={getQrLink(qr.qr_token)}
                      size={200}
                      bgColor="#ffffff"
                      fgColor="#0b0716"
                    />
                    <p className="text-xs text-gray-500 mt-2 font-mono">
                      {qr.title}
                    </p>
                  </div>
                )}

                <div className="mt-2">
                  <div className="flex justify-between text-xs text-text-muted mb-1">
                    <span>Usos</span>
                    <span>
                      {qr.used_count} / {qr.max_uses}
                    </span>
                  </div>

                  <div className="w-full bg-background rounded-full h-1.5">
                    <div
                      className="bg-gold h-1.5 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          (qr.used_count / qr.max_uses) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}