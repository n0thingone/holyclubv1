"use client";

export default function AdminItemsPage() {
  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-6 text-white">
      <div className="mx-auto max-w-md">
        <h1 className="mb-2 text-2xl font-bold">Agregar items</h1>
        <p className="text-sm text-white/60">
          Acá vamos a crear canjes, productos y recompensas.
        </p>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-white/70">
            Pantalla base creada. Después acá armamos el formulario para:
          </p>

          <ul className="mt-3 space-y-2 text-sm text-white/55">
            <li>• Nombre del item</li>
            <li>• Descripción</li>
            <li>• Imagen</li>
            <li>• Costo en créditos</li>
            <li>• Stock</li>
            <li>• Activo / inactivo</li>
          </ul>
        </div>
      </div>
    </main>
  );
}