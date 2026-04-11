"use client";

import { useState, useEffect, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useActiveEvent } from "@/hooks/useActiveEvent";
import { QRCodeSVG } from "qrcode.react";
import { Crown, Copy, Check, Share2, Download, Sparkles } from "lucide-react";
import { generateQrToken } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import type { GoldQr } from "@/types";
import { toPng } from "html-to-image";

export default function GoldPage() {
  const [qrs, setQrs] = useState<GoldQr[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [title, setTitle] = useState("VIP ENTRY");
  const [maxUses, setMaxUses] = useState(10);
  const [expiresAt, setExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);

  const qrRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { event } = useActiveEvent();
  const { profile } = useAuth();
  const supabase = getSupabaseClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  useEffect(() => {
    void fetchQrs();
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
    const text = encodeURIComponent(`✦ HOLY VIP ENTRY — ${title}\n${link}`);
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

      setTitle("VIP ENTRY");
      setMaxUses(10);
      setExpiresAt("");

      await fetchQrs();
    } catch (err: any) {
      alert(err?.message || "No se pudo crear el QR Gold");
    } finally {
      setCreating(false);
    }
  }

  async function handleDownloadQr(qr: GoldQr) {
    const node = qrRefs.current[qr.id];
    if (!node) return;

    try {
      setDownloadingId(qr.id);

      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: "#120b03",
      });

      const link = document.createElement("a");
      const safeTitle = String(qr.title || "vip-entry")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-_]/g, "");

      link.download = `${safeTitle || "vip-entry"}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      alert("No pude guardar la imagen del QR");
    } finally {
      setDownloadingId(null);
    }
  }

  const statusColor = (s: string, expired?: boolean) =>
    expired
      ? "text-red-400 border-red-400/30 bg-red-400/10"
      : s === "active"
        ? "text-emerald-300 border-emerald-400/30 bg-emerald-400/10"
        : s === "exhausted"
          ? "text-amber-300 border-amber-300/30 bg-amber-300/10"
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
      <div className="flex min-h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-300/30 border-t-amber-300" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg animate-fade-in space-y-5 px-4 py-6">
      <div className="flex items-center gap-3">
        <Crown className="h-6 w-6 text-amber-300" />
        <div>
          <h1 className="font-display text-2xl font-black tracking-widest text-white">
            QR GOLD
          </h1>
          <p className="text-sm text-text-muted">{qrs.length} creados</p>
        </div>
      </div>

      {event && (
        <div className="holy-card space-y-4">
          <div>
            <h2 className="font-display text-sm font-bold tracking-widest text-amber-300">
              ✦ CREAR QR GOLD
            </h2>
            <p className="text-xs text-text-muted">
              Generá accesos VIP con nombre, cantidad de usos y horario límite
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="holy-label">Título / Alias</label>
              <input
                className="holy-input"
                placeholder="Ej: VIP ENTRY / Amigos Belu / Fran amigo"
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
              <p className="mt-1 text-xs text-text-muted">
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
        <div className="holy-card py-6 text-center">
          <p className="text-sm text-text-muted">
            No hay evento activo para crear QR Gold
          </p>
        </div>
      )}

      {qrs.length === 0 ? (
        <div className="holy-card py-12 text-center">
          <Crown className="mx-auto mb-3 h-12 w-12 text-amber-300 opacity-30" />
          <p className="text-sm text-text-muted">No hay QR Gold creados aún</p>
        </div>
      ) : (
        <div className="space-y-3">
          {qrs.map((qr) => {
            const expired = isExpired((qr as any).expires_at);

            return (
              <div key={qr.id} className="holy-card">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-sm font-bold tracking-wider text-white">
                      {qr.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {new Date(qr.created_at).toLocaleDateString("es-AR")} ·{" "}
                      {qr.used_count}/{qr.max_uses} usos
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {expired
                        ? `Venció: ${formatDateTime((qr as any).expires_at)}`
                        : `Válido hasta: ${formatDateTime((qr as any).expires_at)}`}
                    </p>
                  </div>

                  <span
                    className={`rounded-lg border px-2 py-1 text-xs font-semibold ${statusColor(
                      qr.status,
                      expired
                    )}`}
                  >
                    {statusLabel(qr.status, expired)}
                  </span>
                </div>

                <div className="mb-3 flex gap-2">
                  <button
                    onClick={() => void copyLink(qr.qr_token, qr.id)}
                    className="holy-btn-secondary flex flex-1 items-center justify-center gap-1.5 py-2 text-xs"
                  >
                    {copiedId === qr.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-300" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copiedId === qr.id ? "Copiado" : "Copiar link"}
                  </button>

                  <button
                    onClick={() => shareWhatsApp(qr.qr_token, qr.title)}
                    className="holy-btn-secondary flex flex-1 items-center justify-center gap-1.5 border-emerald-400/30 py-2 text-xs text-emerald-300 hover:border-emerald-400"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    WhatsApp
                  </button>

                  <button
                    onClick={() => setExpandedId(expandedId === qr.id ? null : qr.id)}
                    className="holy-btn-secondary px-3 py-2 text-xs"
                  >
                    QR
                  </button>
                </div>

                {expandedId === qr.id && (
                  <div className="rounded-[28px] border border-amber-300/20 bg-[#120b03] p-4">
                    <div className="flex flex-col items-center gap-4">
                      <div
                        ref={(node) => {
                          qrRefs.current[qr.id] = node;
                        }}
                        className="relative w-full max-w-[320px] overflow-hidden rounded-[30px] border border-amber-300/40 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.28),rgba(245,158,11,0.14)_34%,rgba(18,11,3,0.98)_100%)] px-6 py-6 text-center shadow-[0_0_70px_rgba(245,158,11,0.20)]"
                      >
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200 to-transparent" />
                        <div className="pointer-events-none absolute -top-14 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full bg-amber-200/12 blur-3xl" />
                        <div className="pointer-events-none absolute -right-10 top-10 h-24 w-24 rounded-full bg-yellow-200/8 blur-2xl" />
                        <div className="pointer-events-none absolute -left-10 bottom-8 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl" />

                        <div className="relative z-10 flex items-center justify-center gap-2">
                          <Sparkles className="h-4 w-4 text-amber-200" />
                          <p className="text-[10px] uppercase tracking-[0.34em] text-amber-100/80">
                            Holy Club
                          </p>
                          <Sparkles className="h-4 w-4 text-amber-200" />
                        </div>

                        <h2 className="relative z-10 mt-2 text-[28px] font-black uppercase tracking-[0.28em] text-amber-300">
                          VIP ENTRY
                        </h2>

                        <p className="relative z-10 mt-2 text-xs font-medium uppercase tracking-[0.18em] text-white/80">
                          {qr.title}
                        </p>

                        <div className="relative z-10 mx-auto mt-5 w-fit rounded-[26px] border border-white/60 bg-white p-4 shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
                          <QRCodeSVG
                            value={getQrLink(qr.qr_token)}
                            size={190}
                            bgColor="#ffffff"
                            fgColor="#0a0a0a"
                          />
                        </div>

                        <div className="relative z-10 mt-5 space-y-1">
                          <p className="text-[10px] uppercase tracking-[0.28em] text-amber-100/65">
                            Acceso especial
                          </p>
                          <p className="text-sm font-semibold text-white">
                            Presentá este QR en puerta
                          </p>
                        </div>

                        <div className="relative z-10 mt-4 flex items-center justify-between rounded-2xl border border-amber-200/15 bg-black/20 px-4 py-3 text-xs text-white/75">
                          <div className="text-left">
                            <p className="uppercase tracking-[0.18em] text-white/40">
                              Usos
                            </p>
                            <p className="mt-1 font-bold text-amber-200">
                              {qr.used_count}/{qr.max_uses}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="uppercase tracking-[0.18em] text-white/40">
                              Estado
                            </p>
                            <p className="mt-1 font-bold text-amber-200">
                              {statusLabel(qr.status, expired)}
                            </p>
                          </div>
                        </div>

                        <p className="relative z-10 mt-4 text-[11px] text-white/45">
                          {expired
                            ? `Venció: ${formatDateTime((qr as any).expires_at)}`
                            : `Válido hasta: ${formatDateTime((qr as any).expires_at)}`}
                        </p>
                      </div>

                      <button
                        onClick={() => void handleDownloadQr(qr)}
                        disabled={downloadingId === qr.id}
                        className="holy-btn-secondary flex items-center justify-center gap-2 px-4 py-2 text-xs"
                      >
                        <Download className="h-3.5 w-3.5" />
                        {downloadingId === qr.id ? "Guardando..." : "Guardar imagen"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-2">
                  <div className="mb-1 flex justify-between text-xs text-text-muted">
                    <span>Usos</span>
                    <span>
                      {qr.used_count} / {qr.max_uses}
                    </span>
                  </div>

                  <div className="h-1.5 w-full rounded-full bg-background">
                    <div
                      className="h-1.5 rounded-full bg-amber-300 transition-all"
                      style={{
                        width: `${Math.min(100, (qr.used_count / qr.max_uses) * 100)}%`,
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
