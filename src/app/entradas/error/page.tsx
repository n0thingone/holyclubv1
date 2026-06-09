"use client";

import Link from "next/link";
import { XCircle } from "lucide-react";

export default function EntradaErrorPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <div className="mx-auto flex min-h-[85vh] max-w-md items-center justify-center">
        <section className="rounded-[2rem] border border-red-500/30 bg-zinc-950 p-6 text-center">
          <XCircle className="mx-auto h-14 w-14 text-red-300" />
          <h1 className="mt-4 text-2xl font-black">Pago no completado</h1>
          <p className="mt-2 text-sm text-zinc-400">
            No se aprobó la compra. Podés volver a intentar desde el link de anticipadas.
          </p>
          <Link href="/entradas" className="mt-5 inline-block rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-black text-black">
            Volver a anticipadas
          </Link>
        </section>
      </div>
    </main>
  );
}
