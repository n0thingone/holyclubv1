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
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export default function RedeemCard({ redeem, onViewQR }: RedeemCardProps) {
  const now = new Date();

  const expired =
    redeem.expires_at && new Date(redeem.expires_at) <= now;

  const realStatus =
    redeem.status === "redeemed"
      ? "redeemed"
      : expired
      ? "expired"
      : "pending";

  return (
    <div className="rounded-xl border border-purple-800/40 bg-[#070012] p-6">
      <div className="flex justify-between items-start">

        <div>
          <h3 className="text-2xl font-bold text-white">
            {redeem.reward?.title ?? "CANJE"}
          </h3>

          <div className="mt-2 space-y-1 text-sm text-purple-200">

            <p>
              Estado:{" "}
              {realStatus === "pending" && (
                <span className="text-yellow-400 font-semibold">
                  PENDIENTE
                </span>
              )}

              {realStatus === "redeemed" && (
                <span className="text-green-400 font-semibold">
                  UTILIZADO
                </span>
              )}

              {realStatus === "expired" && (
                <span className="text-red-500 font-semibold">
                  EXPIRADO
                </span>
              )}
            </p>

            <p>
              Costo: {redeem.reward?.cost_credits ?? 0} CRÉDITOS
            </p>

            <p>
              Creado: {formatDate(redeem.created_at)}
            </p>

            {realStatus === "expired" ? (
              <p className="text-red-500 font-bold">
                ❌ QR VENCIDO
              </p>
            ) : (
              <p className="text-yellow-400">
                Vence: {formatDate(redeem.expires_at)}
              </p>
            )}

          </div>
        </div>

        <button
          onClick={() =>
            realStatus === "pending" && onViewQR(redeem)
          }
          disabled={realStatus !== "pending"}
          className={`px-4 py-2 rounded-lg font-bold ${
            realStatus === "pending"
              ? "bg-purple-400 text-black hover:bg-purple-300"
              : "bg-gray-800 text-gray-500 cursor-not-allowed"
          }`}
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