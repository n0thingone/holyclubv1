"use client";

import QRCode from "react-qr-code";

type Props = {
  open: boolean;
  onClose: () => void;
  qrToken: string;
  shortToken?: string | null;
  title?: string;
  expiresAt?: string | null;
};

function formatDate(dateString?: string | null) {
  if (!dateString) return "-";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(dateString));
}

export function RedemptionQrModal({
  open,
  onClose,
  qrToken,
  shortToken,
  title = "QR de canje",
  expiresAt,
}: Props) {
  if (!open) return null;

 const qrValue = `HOLY:${qrToken}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-neutral-950 p-5 text-white shadow-2xl">
        <div className="text-center text-xl font-bold">{title}</div>

        {shortToken && (
          <div className="mt-5 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-white/45">
              Token manual
            </p>
            <p className="mt-2 text-4xl font-black tracking-[0.18em] text-fuchsia-300">
              {shortToken}
            </p>
          </div>
        )}

        <div className="mt-5 flex justify-center rounded-2xl bg-white p-4">
          <QRCode value={qrValue} size={220} />
        </div>

        <div className="mt-4 break-all text-center text-sm text-white/70">
          QR token: {qrToken}
        </div>

        {expiresAt && (
          <div className="mt-2 text-center text-sm text-amber-300">
            Vence: {formatDate(expiresAt)}
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-2">
          <button
            onClick={onClose}
            className="rounded-2xl bg-white py-3 font-semibold text-black"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}