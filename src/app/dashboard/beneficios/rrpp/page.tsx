"use client";

import { Martini, QrCode, Sparkles } from "lucide-react";
import DashboardShell from "@/components/navigation/DashboardShell";

const consumiciones = [
  {
    title: "VASO DE LITRO",
    description: "1 por evento para RRPP.",
  },
  {
    title: "SHOT GRATIS",
    description: "Consumición rápida para RRPP.",
  },
  {
    title: "CONSUMICIÓN ESPECIAL",
    description: "Beneficio extra según evento.",
  },
];

export default function RRPPPage() {
  return (
    <DashboardShell title="HOLY · RRPP BENEFICIOS">
      <div className="mx-auto max-w-4xl space-y-6 px-4 pb-24">

        <section className="rounded-[32px] border border-cyan-500/20 bg-cyan-500/5 p-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Martini className="h-6 w-6 text-cyan-300" />
            <h1 className="text-2xl font-black text-white">
              Consumiciones RRPP
            </h1>
          </div>

          <p className="mt-2 text-sm text-white/60">
            Beneficios exclusivos para RRPP. Cada uno genera un QR único.
          </p>
        </section>

        {consumiciones.map((item, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 flex items-center justify-between"
          >
            <div>
              <h2 className="text-lg font-bold text-white">{item.title}</h2>
              <p className="text-sm text-white/60">{item.description}</p>
            </div>

            <button className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white hover:bg-white/10">
              <QrCode className="h-4 w-4" />
              Generar QR
            </button>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}