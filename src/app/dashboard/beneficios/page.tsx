"use client";

import Link from "next/link";
import {
  Gift,
  Sparkles,
  Trophy,
  Flame,
  ChevronRight,
  Gem,
  Crown,
  Target,
} from "lucide-react";

export default function BeneficiosPage() {
  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-20">
      <div className="space-y-5">
        <Link href="/dashboard/beneficios/mystery-box" className="block">
          <div className="group relative overflow-hidden rounded-[2rem] border border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-600/20 via-black to-purple-950/40 p-6 shadow-[0_0_35px_rgba(217,70,239,0.16)] transition active:scale-[0.98]">
            <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-fuchsia-500/25 blur-3xl" />
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

                <ChevronRight className="h-6 w-6 text-white/50" />
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

                <div className="rounded-full bg-white px-4 py-2 text-xs font-black text-fuchsia-700">
                  JUGAR
                </div>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/beneficios/progreso" className="block">
          <div className="group relative overflow-hidden rounded-[2rem] border border-yellow-400/30 bg-gradient-to-br from-yellow-500/15 via-black to-fuchsia-950/35 p-6 shadow-[0_0_35px_rgba(250,204,21,0.12)] transition active:scale-[0.98]">
            <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-yellow-400/20 blur-3xl" />
            <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-fuchsia-700/20 blur-3xl" />

            <div className="relative">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative rounded-3xl bg-yellow-500/15 p-4 text-yellow-300 shadow-[0_0_25px_rgba(250,204,21,0.22)]">
                    <Crown className="h-8 w-8" />
                    <Target className="absolute -right-1 -top-1 h-4 w-4 text-fuchsia-200" />
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.35em] text-yellow-200/70">
                      Pase Holy
                    </p>
                    <h2 className="text-3xl font-black leading-none text-white">
                      Logros
                    </h2>
                  </div>
                </div>

                <ChevronRight className="h-6 w-6 text-white/50" />
              </div>

              <p className="mb-5 text-sm leading-relaxed text-white/70">
                Subí de nivel, desbloqueá recompensas y reclamá premios en el
                camino de progreso.
              </p>

              <div className="mb-5 grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-center">
                  <Crown className="mx-auto mb-1 h-5 w-5 text-yellow-300" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">
                    Nivel
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-center">
                  <Sparkles className="mx-auto mb-1 h-5 w-5 text-fuchsia-300" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">
                    Misiones
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-center">
                  <Gift className="mx-auto mb-1 h-5 w-5 text-cyan-300" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">
                    Premios
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-yellow-300/20 bg-yellow-500/10 px-4 py-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-yellow-100/60">
                    Progreso
                  </p>
                  <p className="text-sm font-black text-white">
                    VER LOGROS / MISIONES
                  </p>
                </div>

                <div className="rounded-full bg-yellow-300 px-4 py-2 text-xs font-black text-black">
                  ENTRAR
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}