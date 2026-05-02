"use client";

import { Crown, Gift, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type LevelUpModalProps = {
  open: boolean;
  level: number;
  rank: string;
  freeBoxesAdded?: number;
  creditsAdded?: number;
  onClose: () => void;
};

export default function LevelUpModal({
  open,
  level,
  rank,
  freeBoxesAdded = 0,
  creditsAdded = 0,
  onClose,
}: LevelUpModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 px-4 text-white backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.82, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 16 }}
            className="relative w-full max-w-sm overflow-hidden rounded-[34px] border border-fuchsia-400/30 bg-[radial-gradient(circle_at_top,rgba(217,70,239,0.35),transparent_35%),radial-gradient(circle_at_bottom,rgba(251,191,36,0.18),transparent_35%),linear-gradient(180deg,rgba(20,9,35,0.98),rgba(5,5,10,0.98))] p-6 text-center shadow-[0_0_90px_rgba(217,70,239,0.35)]"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/10 p-2 text-white/70"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="pointer-events-none absolute inset-0 opacity-70">
              {Array.from({ length: 18 }).map((_, i) => (
                <span
                  key={i}
                  className="absolute h-1.5 w-1.5 rounded-full bg-fuchsia-200 shadow-[0_0_14px_rgba(217,70,239,0.9)]"
                  style={{
                    left: `${(i * 37) % 100}%`,
                    top: `${(i * 53) % 100}%`,
                  }}
                />
              ))}
            </div>

            <div className="relative z-10">
              <motion.div
                animate={{ rotate: [0, -8, 8, -5, 5, 0], scale: [1, 1.12, 1] }}
                transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 1.4 }}
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] border border-amber-300/40 bg-amber-400/15 shadow-[0_0_45px_rgba(251,191,36,0.25)]"
              >
                <Crown className="h-10 w-10 text-amber-200" />
              </motion.div>

              <p className="mt-5 text-[11px] font-black uppercase tracking-[0.35em] text-fuchsia-300">
                Level Up
              </p>

              <h2 className="mt-2 text-4xl font-black uppercase leading-none tracking-[-0.06em]">
                Nivel {level}
              </h2>

              <p className="mt-2 text-xl font-black text-amber-200">
                {rank}
              </p>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/8 p-4">
                <div className="flex items-center justify-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-white/70">
                  <Sparkles className="h-4 w-4 text-fuchsia-300" />
                  Recompensas
                </div>

                <div className="mt-3 space-y-2">
                  {creditsAdded > 0 ? (
                    <p className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-200">
                      +{creditsAdded.toLocaleString("es-AR")} créditos
                    </p>
                  ) : null}

                  {freeBoxesAdded > 0 ? (
                    <p className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm font-bold text-amber-200">
                      <Gift className="mr-1 inline h-4 w-4" />
                      +{freeBoxesAdded} Mystery Box gratis
                    </p>
                  ) : null}

                  {creditsAdded <= 0 && freeBoxesAdded <= 0 ? (
                    <p className="text-sm text-white/55">
                      Nuevo rango desbloqueado.
                    </p>
                  ) : null}
                </div>
              </div>

              <button
                onClick={onClose}
                className="mt-5 w-full rounded-2xl bg-fuchsia-600 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_0_30px_rgba(217,70,239,0.35)]"
              >
                Seguir
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}