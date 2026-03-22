"use client";

import { Trophy } from "lucide-react";
import DashboardShell from "@/components/navigation/DashboardShell";

const logros = [
  {
    title: "Primera visita a HOLY",
    unlocked: true,
  },
  {
    title: "Abriste tu primera Mystery Box",
    unlocked: false,
  },
  {
    title: "Ganaste premio legendario",
    unlocked: false,
  },
];

export default function LogrosPage() {
  return (
    <DashboardShell title="HOLY · LOGROS">
      <div className="mx-auto max-w-4xl space-y-6 px-4 pb-24">

        <section className="rounded-[32px] border border-amber-500/20 bg-amber-500/5 p-6">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-amber-300" />
            <h1 className="text-2xl font-black text-white">Logros</h1>
          </div>

          <p className="mt-2 text-sm text-white/60">
            Desbloqueá hitos dentro de HOLY.
          </p>
        </section>

        {logros.map((logro, i) => (
          <div
            key={i}
            className={`rounded-2xl border p-5 ${
              logro.unlocked
                ? "border-amber-400/40 bg-amber-500/10"
                : "border-white/10 bg-white/5"
            }`}
          >
            <h2 className="font-bold text-white">{logro.title}</h2>

            <p className="text-sm text-white/60">
              {logro.unlocked ? "Desbloqueado" : "Bloqueado"}
            </p>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}