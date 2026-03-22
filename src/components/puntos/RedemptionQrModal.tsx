"use client";

import QRCode from "react-qr-code";

type Props = {
  open: boolean;
  onClose: () => void;
  qrToken: string;
  title?: string;
  expiresAt?: string | null;
};

export function RedemptionQrModal({
  open,
  onClose,
  qrToken,
  title = "QR de canje",
  expiresAt,
}: Props) {
  if (!open) return null;

  const qrValue = `HOLY-REDEEM:${qrToken}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-neutral-950 text-white p-5 shadow-2xl">
        <div className="text-xl font-bold text-center">{title}</div>

        <div className="mt-5 bg-white rounded-2xl p-4 flex justify-center">
          <QRCode value={qrValue} size={220} />
        </div>

        <div className="mt-4 text-center text-sm text-white/70 break-all">
          Token: {qrToken}
        </div>

        {expiresAt && (
          <div className="mt-2 text-center text-sm text-amber-300">
            Vence: {new Date(expiresAt).toLocaleString("es-AR")}
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-2">
          <button
            onClick={onClose}
            className="rounded-2xl bg-white text-black font-semibold py-3"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}