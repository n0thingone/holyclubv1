"use client";

import { useState } from "react";
import { Chrome, Sparkles } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = getSupabaseClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getSafeRedirect() {
    if (typeof window === "undefined") return "/dashboard/puntos/home";

    const params = new URLSearchParams(window.location.search);

    let redirect =
      params.get("redirect") ||
      params.get("next") ||
      "/dashboard/puntos/home";

    if (!redirect.startsWith("/") || redirect.startsWith("//")) {
      redirect = "/dashboard/puntos/home";
    }

    return redirect;
  }

  function handleGoogleLogin() {
    setLoading(true);
    setError(null);

    if (typeof window !== "undefined") {
      localStorage.removeItem("holy_guest");
      localStorage.setItem("holy_redirect", getSafeRedirect());
    }

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : undefined;

    // MODO EMERGENCIA:
    // No animaciones, no delays, no prompt consent, no access_type offline.
    // Apenas toca el botón, Supabase debe mandar a Google.
    supabase.auth
      .signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      })
      .then(({ error }) => {
        if (error) {
          console.error("Google login error:", error);
          setError("Error al abrir Google. Probá de nuevo.");
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Google login crash:", err);
        setError("Error al abrir Google. Probá de nuevo.");
        setLoading(false);
      });

    // Fallback visual: si por alguna razón no redirige, no dejamos silencio eterno.
    setTimeout(() => {
      setLoading(false);
    }, 12000);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-[280px] w-[280px] -translate-x-1/2 rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-fuchsia-300">
            <Sparkles size={14} />
            Inicio
          </div>

          <h1 className="mt-4 text-4xl font-black tracking-widest">
            HOLY CLUB
          </h1>

          <p className="mt-3 text-sm text-white/60">
            Entrá a tu cuenta y viví la experiencia.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full rounded-xl bg-white py-4 font-bold text-black transition hover:scale-[1.02] disabled:opacity-70"
          >
            <div className="flex items-center justify-center gap-2">
              <Chrome size={18} />
              {loading ? "Abriendo Google..." : "Continuar con Google"}
            </div>
          </button>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-xs text-white/45">
            Modo invitado desactivado temporalmente.
          </div>

          {error && <p className="text-center text-sm text-red-400">{error}</p>}
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <div className="absolute h-[320px] w-[320px] animate-pulse rounded-full bg-fuchsia-500/20 blur-3xl" />

          <div className="relative px-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-fuchsia-400 shadow-[0_0_40px_rgba(217,70,239,0.35)]">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-t-white border-fuchsia-400" />
            </div>

            <h2 className="mt-6 text-xl font-bold text-cyan-300 transition-all duration-300">
              Abriendo Google...
            </h2>

            <p className="mx-auto mt-3 max-w-xs text-xs text-white/45">
              Si no abre, tocá de nuevo en unos segundos.
            </p>

            <div className="mx-auto mt-4 h-2 w-44 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-2/3 animate-pulse bg-fuchsia-400 shadow-[0_0_20px_rgba(217,70,239,0.55)]" />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
