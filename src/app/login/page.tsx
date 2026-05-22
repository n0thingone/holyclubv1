"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Chrome, UserRound, Sparkles } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = getSupabaseClient();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stageText, setStageText] = useState("Preparando acceso...");
  const [stageColor, setStageColor] = useState("text-fuchsia-300");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function handleGoogleLogin() {
    try {
      setLoading(true);
      setError(null);

      if (typeof window !== "undefined") {
        localStorage.removeItem("holy_guest");
      }

      // MODO EVENTO: loader corto y decorativo. No bloqueamos de más.
      const steps = [
        { text: "Preparando acceso...", color: "text-fuchsia-300", ms: 250 },
        { text: "Buscando tu cuenta...", color: "text-white", ms: 300 },
        { text: "Dale que ya entrás...", color: "text-orange-300", ms: 300 },
        { text: "Abriendo Google...", color: "text-green-300", ms: 250 },
      ];

      for (const step of steps) {
        setStageText(step.text);
        setStageColor(step.color);
        await sleep(step.ms);
      }

      navigator.vibrate?.([50, 30, 80]);

      try {
        void audioRef.current?.play();
      } catch {}

      // Guardar redirect real ANTES de ir a Google.
      const params = new URLSearchParams(window.location.search);

      let redirect =
        params.get("redirect") ||
        params.get("next") ||
        "/dashboard/puntos/home";

      // Evita redirects raros o externos.
      if (!redirect.startsWith("/")) {
        redirect = "/dashboard/puntos/home";
      }

      localStorage.setItem("holy_redirect", redirect);

      setStageText("Conectando con Google...");
      setStageColor("text-cyan-300");

      const redirectTo = `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          // IMPORTANTE PARA HOY:
          // Sacamos prompt: "consent" y access_type: "offline" porque fuerza
          // consentimiento cada vez y puede hacer más lento/trabado el login.
        },
      });

      if (error) throw error;
    } catch (err: any) {
      console.error("Google login error:", err);
      setError("Error al iniciar sesión. Probá de nuevo.");
      setLoading(false);
      setStageText("Preparando acceso...");
      setStageColor("text-fuchsia-300");
    }
  }

  async function handleGuestLogin() {
    try {
      setGuestLoading(true);
      setError(null);

      if (typeof window !== "undefined") {
        localStorage.setItem("holy_guest", "true");
      }

      router.push("/dashboard/puntos/home");
    } catch {
      setGuestLoading(false);
      setError("No se pudo continuar como invitado.");
    }
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
            onClick={handleGoogleLogin}
            disabled={loading || guestLoading}
            className="w-full rounded-xl bg-white py-4 font-bold text-black transition hover:scale-[1.02] disabled:opacity-70"
          >
            <div className="flex items-center justify-center gap-2">
              <Chrome size={18} />
              {loading ? "Abriendo Google..." : "Continuar con Google"}
            </div>
          </button>

          <button
            onClick={handleGuestLogin}
            disabled={loading || guestLoading}
            className="w-full rounded-xl bg-fuchsia-500/20 py-4 font-bold transition hover:scale-[1.02] disabled:opacity-70"
          >
            <div className="flex items-center justify-center gap-2">
              <UserRound size={18} />
              {guestLoading ? "..." : "Seguir como invitado"}
            </div>
          </button>

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

            <h2 className={`mt-6 text-xl font-bold transition-all duration-300 ${stageColor}`}>
              {stageText}
            </h2>

            <p className="mx-auto mt-3 max-w-xs text-xs text-white/45">
              Si tarda demasiado, cerrá esta pestaña y volvé a intentar.
            </p>

            <div className="mx-auto mt-4 h-2 w-44 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-2/3 animate-pulse bg-fuchsia-400 shadow-[0_0_20px_rgba(217,70,239,0.55)]" />
            </div>
          </div>
        </div>
      )}

      <audio ref={audioRef} preload="auto" src="/sounds/holy-access.mp3" />
    </main>
  );
}
