"use client";

import Link from "next/link";
import { Coins, Gift, Crown, ArrowLeft } from "lucide-react";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-6 text-white">
      <div className="mx-auto max-w-md space-y-6">

        <h1 className="text-3xl font-bold">Panel ADMIN</h1>
        <p className="text-white/60 text-sm">
          Herramientas administrativas de HOLY
        </p>

        <div className="space-y-3">

          <Link
            href="/dashboard/admin/puntos"
            className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
          >
            <Coins className="h-5 w-5 text-yellow-400" />
            <div>
              <div className="font-semibold">Cargar créditos</div>
              <div className="text-sm text-white/50">
                Sumar puntos a usuarios
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/rewards"
            className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
          >
            <Gift className="h-5 w-5 text-fuchsia-400" />
            <div>
              <div className="font-semibold">Crear recompensas</div>
              <div className="text-sm text-white/50">
                Items que se pueden canjear
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/gold"
            className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
          >
            <Crown className="h-5 w-5 text-orange-400" />
            <div>
              <div className="font-semibold">QR Gold</div>
              <div className="text-sm text-white/50">
                Accesos especiales
              </div>
            </div>
          </Link>

        </div>

        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-white/60 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al dashboard
        </Link>

      </div>
    </main>
  );
}