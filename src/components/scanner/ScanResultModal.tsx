"use client";

import { X, CheckCircle, XCircle, Clock, Crown } from "lucide-react";

interface Props {
  open: boolean;
  status: "loading" | "success" | "error" | "gold";
  title?: string;
  message?: string;
  detail?: string;
  onClose?: () => void;
}

export default function ScanResultModal({
  open,
  status,
  title,
  message,
  detail,
  onClose,
}: Props) {
  if (!open) return null;

  const config = {
    loading: {
      overlay: "bg-black/80",
      card: "border-white/10 bg-zinc-950/95",
      title: "text-white",
      message: "text-white/75",
      detail: "text-white/50",
      ring: "shadow-[0_0_90px_rgba(255,255,255,0.08)]",
      Icon: Clock,
      iconClass: "text-yellow-300 animate-pulse",
      badge: "",
    },
    success: {
      overlay: "bg-black/75",
      card: "border-emerald-400/40 bg-emerald-500/15",
      title: "text-emerald-300",
      message: "text-white/90",
      detail: "text-emerald-100/70",
      ring: "shadow-[0_0_90px_rgba(16,185,129,0.28)]",
      Icon: CheckCircle,
      iconClass: "text-emerald-300",
      badge: "",
    },
    error: {
      overlay: "bg-black/75",
      card: "border-red-400/40 bg-red-500/15",
      title: "text-red-300",
      message: "text-white/90",
      detail: "text-red-100/70",
      ring: "shadow-[0_0_90px_rgba(239,68,68,0.25)]",
      Icon: XCircle,
      iconClass: "text-red-300",
      badge: "",
    },
    gold: {
      overlay: "bg-black/80",
      card:
        "border-amber-300/45 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.18),rgba(245,158,11,0.10)_42%,rgba(0,0,0,0.92)_100%)]",
      title: "text-amber-300",
      message: "text-white",
      detail: "text-amber-100/80",
      ring: "shadow-[0_0_110px_rgba(245,158,11,0.30)]",
      Icon: Crown,
      iconClass: "text-amber-300",
      badge:
        "absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/90 to-transparent",
    },
  }[status];

  const Icon = config.Icon;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-5 backdrop-blur-md ${config.overlay}`}
    >
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-[28px] border px-6 py-7 text-center ${config.card} ${config.ring}`}
      >
        {!!config.badge && <div className={config.badge} />}

        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/20 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex justify-center">
          <div
            className={`rounded-full border border-white/10 bg-black/20 p-4 ${
              status === "gold"
                ? "shadow-[0_0_35px_rgba(245,158,11,0.25)]"
                : ""
            }`}
          >
            <Icon className={`h-14 w-14 ${config.iconClass}`} />
          </div>
        </div>

        <h2 className={`text-2xl font-black tracking-wide ${config.title}`}>
          {title || "Procesando..."}
        </h2>

        {!!message && (
          <p className={`mt-3 text-base font-semibold ${config.message}`}>
            {message}
          </p>
        )}

        {!!detail && (
          <p className={`mt-2 text-sm ${config.detail}`}>
            {detail}
          </p>
        )}

        {status === "loading" && (
          <div className="mt-5 flex items-center justify-center gap-2">
            <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-yellow-300 [animation-delay:-0.3s]" />
            <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-yellow-300 [animation-delay:-0.15s]" />
            <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-yellow-300" />
          </div>
        )}

        {status === "gold" && (
          <div className="mt-5 flex items-center justify-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-300" />
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-yellow-200 [animation-delay:0.15s]" />
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-300 [animation-delay:0.3s]" />
          </div>
        )}
      </div>
    </div>
  );
}