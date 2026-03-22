"use client";

import { Target } from "lucide-react";
import DashboardShell from "@/components/navigation/DashboardShell";

const misiones = [
  {
    title: "Venir a HOLY 5 veces",
    progress: 2,
    goal: 5,
    reward: 3000,
  },
  {
    title: "Abrir 3 Mystery Box",
    progress: 1,
    goal: 3,
    reward: 1000,
  },
];

export default function MisionesPage() {
  return (
    <DashboardShell title="HOLY · MISIONES">
      <div className="mx-auto max-w-4xl space-y-6 px-4 pb-24">

        <section className="rounded-[32px] border border-emerald-500/20 bg-emerald-500/5 p-6">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-emerald-300" />
            <h1 className="text-2xl font-black text-white">Misiones</h1>
          </div>

          <p className="mt-2 text-sm text-white/60">
            Cumplí objetivos y ganá créditos extra.
          </p>
        </section>

        {misiones.map((mision, i) => {
          const percent = (mision.progress / mision.goal) * 100;

          return (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <h2 className="font-bold text-white">{mision.title}</h2>

              <div className="mt-3 h-2 w-full rounded bg-black/40">
                <div
                  className="h-2 rounded bg-emerald-400"
                  style={{ width: `${percent}%` }}
                />
              </div>

              <div className="mt-2 flex justify-between text-sm text-white/60">
                <span>
                  {mision.progress}/{mision.goal}
                </span>
                <span>+{mision.reward} créditos</span>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardShell>
  );
}