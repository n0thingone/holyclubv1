"use client";

type Reward = {
  id: string;
  title: string;
  cost_credits: number;
};

type Redeem = {
  id: string;
  status: "pending" | "redeemed" | "expired" | string;
  created_at: string;
  expires_at: string | null;
  redeemed_at?: string | null;
  qr_token?: string | null;
  short_token?: string | null;
  reward?: Reward | null;
};

interface RedeemCardProps {
  redeem: Redeem;
  onViewQR: (redeem: Redeem) => void;
}

function formatDate(dateString?: string | null) {
  if (!dateString) return "-";

  const date = new Date(dateString);

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export default function RedeemCard({ redeem, onViewQR }: RedeemCardProps) {
  const now = new Date();

  const expired = redeem.expires_at ? new Date(redeem.expires_at) <= now : false;

  const realStatus =
    redeem.status === "redeemed"
      ? "redeemed"
      : redeem.status === "expired" || expired
      ? "expired"
      : "pending";

  const statusText =
    realStatus === "redeemed"
      ? "UTILIZADO"
      : realStatus === "expired"
      ? "EXPIRADO"
      : "PENDIENTE";

  const statusColor =
    realStatus === "redeemed"
      ? "text-green-400"
      : realStatus === "expired"
      ? "text-red-500"
      : "text-yellow-400";

  const buttonClass =
    realStatus === "pending"
      ? "bg-purple-400 text-black hover:bg-purple-300"
      : "bg-gray-800 text-gray-500 cursor-not-allowed";

  return (
    <div className="rounded-xl border border-purple-800/40 bg-[#070012] p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h3 className="text-2xl font-bold text-white">
            {redeem.reward?.title ?? "CANJE"}
          </h3>

          <div className="mt-3 space-y-1.5 text-sm text-purple-200">
            <p>
              Estado: <span className={`font-semibold ${statusColor}`}>{statusText}</span>
            </p>

            <p>
              Costo: {redeem.reward?.cost_credits ?? 0} CRÉDITOS
            </p>

            <p>
              Creado: {formatDate(redeem.created_at)}
            </p>

            {realStatus === "redeemed" && redeem.redeemed_at ? (
              <p className="text-green-400">
                Utilizado: {formatDate(redeem.redeemed_at)}
              </p>
            ) : realStatus === "expired" ? (
              <p className="font-bold text-red-500">❌ QR VENCIDO</p>
            ) : (
              <p className="text-yellow-400">
                Vence: {formatDate(redeem.expires_at)}
              </p>
            )}

            {redeem.short_token && (
              <p>
                Token manual:{" "}
                <span className="font-bold tracking-[0.18em] text-fuchsia-300">
                  {redeem.short_token}
                </span>
              </p>
            )}

            {redeem.qr_token && (
              <p className="break-all text-xs text-purple-300/80">
                QR token: {redeem.qr_token}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => {
            if (realStatus === "pending") onViewQR(redeem);
          }}
          disabled={realStatus !== "pending"}
          className={`rounded-lg px-4 py-2 font-bold transition ${buttonClass}`}
        >
          {realStatus === "expired"
            ? "VENCIDO"
            : realStatus === "redeemed"
            ? "UTILIZADO"
            : "VER QR"}
        </button>
      </div>
    </div>
  );
}