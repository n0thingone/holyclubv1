"use client";

import Link from "next/link";
import {
  Gift,
  Beer,
  Sparkles,
  Trophy,
  Flame,
  ChevronRight,
  Star,
  Gem,
} from "lucide-react";

export default function BeneficiosPage() {
  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-20">
      <div className="space-y-5">
        {/* HERO MYSTERY BOX */}
        <Link href="/dashboard/beneficios/mystery-box" className="block">
          <div className="group relative overflow-hidden rounded-[2rem] border border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-600/20 via-black to-purple-950/40 p-6 shadow-[0_0_35px_rgba(217,70,239,0.16)] transition active:scale-[0.98]">
            <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-fuchsia-500/25 blur-3xl transition group-hover:bg-fuchsia-400/35" />
            <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-purple-700/20 blur-3xl" />

            <div className="relative">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative rounded-3xl bg-fuchsia-500/20 p-4 text-fuchsia-200 shadow-[0_0_25px_rgba(217,70,239,0.35)]">
                    <Gift className="h-8 w-8" />
                    <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-white" />
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.35em] text-fuchsia-200/70">
                      Holy Club
                    </p>
                    <h2 className="text-3xl font-black leading-none text-white">
                      Mystery Box
                    </h2>
                  </div>
                </div>

                <ChevronRight className="h-6 w-6 text-white/50 transition group-hover:translate-x-1 group-hover:text-white" />
              </div>

              <p className="mb-5 text-sm leading-relaxed text-white/70">
                Abrí cajas, gastá créditos y llevate premios épicos, raros o
                legendarios.
              </p>

              <div className="mb-5 grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-center">
                  <Flame className="mx-auto mb-1 h-5 w-5 text-orange-300" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">
                    Épicos
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-center">
                  <Gem className="mx-auto mb-1 h-5 w-5 text-cyan-300" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">
                    Raros
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-center">
                  <Trophy className="mx-auto mb-1 h-5 w-5 text-yellow-300" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">
                    Leyenda
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-fuchsia-300/20 bg-fuchsia-500/15 px-4 py-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-fuchsia-100/60">
                    Entrar ahora
                  </p>
                  <p className="text-sm font-black text-white">
                    ABRIR HOLY BOX
                  </p>
                </div>

                <div className="rounded-full bg-white px-4 py-2 text-xs font-black text-fuchsia-700 shadow-[0_0_20px_rgba(255,255,255,0.25)]">
                  JUGAR
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* MINI BENEFICIOS */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <Star className="mb-3 h-6 w-6 text-fuchsia-300" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">
              Premios
            </p>
            <h3 className="mt-1 text-lg font-black text-white">
              Sorpresa
            </h3>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <Trophy className="mb-3 h-6 w-6 text-yellow-300" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">
              Ranking
            </p>
            <h3 className="mt-1 text-lg font-black text-white">
              Pronto
            </h3>
          </div>
        </div>

        {/* PROXIMAMENTE */}
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 opacity-80">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-500/15 p-3 text-cyan-300">
              <Beer className="h-6 w-6" />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300/70">
                Próximamente
              </p>
              <h2 className="text-xl font-black text-white">
                Canjes especiales
              </h2>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-white/60">
            Beneficios exclusivos, misiones, desafíos y premios especiales van a
            aparecer acá.
          </p>
        </div>
      </div>
    </div>
  );
}