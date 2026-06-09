"use client";

import Link from "next/link";
import { Clock } from "lucide-react";

export default function EntradaPendientePage() {
  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <div className="mx-auto flex min-h-[85vh] max-w-md items-center justify-center">
        <section className="rounded-[2rem] border border-yellow-400/30 bg-zinc-950 p-6 text-center">
          <Clock className="mx-auto h-14 w-14 text-yellow-300" />
          <h1 className="mt-4 text-2xl font-black">Pago pendiente</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Mercado Pago todavía no aprobó el pago. Cuando se apruebe, la entrada aparece automáticamente.
          </p>
          <Link href="/entradas" className="mt-5 inline-block rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-black text-black">
            Volver a anticipadas
          </Link>
        </section>
      </div>
    </main>
  );
}
