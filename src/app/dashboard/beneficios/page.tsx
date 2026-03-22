"use client";

import Link from "next/link";
import { Gift, Beer } from "lucide-react";

export default function BeneficiosPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-2">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Link href="/dashboard/beneficios/mystery-box">
          <div className="group cursor-pointer rounded-3xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-600/10 to-black p-6 transition hover:border-fuchsia-400/40 hover:shadow-[0_0_30px_rgba(217,70,239,0.18)]">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-fuchsia-500/15 p-3 text-fuchsia-300">
                <Gift className="h-6 w-6" />
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-300/70">
                  Holy Club
                </p>
                <h2 className="text-xl font-black text-white">Mystery Box</h2>
              </div>
            </div>

            <p className="text-sm text-white/65">
              Abrí cajas, gastá créditos y llevate premios épicos, raros o legendarios.
            </p>
          </div>
        </Link>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 opacity-70">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-500/15 p-3 text-cyan-300">
              <Beer className="h-6 w-6" />
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">
                Próximamente
              </p>
              <h2 className="text-xl font-black text-white">
                Canjes especiales
              </h2>
            </div>
          </div>

          <p className="text-sm text-white/60">
            Más beneficios, premios y desafíos van a aparecer acá.
          </p>
        </div>
      </div>
    </div>
  );
}