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

  async function handleGoogleLogin() {
    try {
      setLoading(true);
      setError(null);

      if (typeof window !== "undefined") {
        localStorage.removeItem("holy_guest");
      }

      const steps = [
        { text: "Buscando si estás en la lista...", color: "text-white" },
        { text: "Mmm... ahí estás 👀", color: "text-yellow-300" },
        { text: "Preparando tu entrada FREE...", color: "text-fuchsia-300" },
        { text: "Cargando temazos 🔊", color: "text-green-300" },
        { text: "Guardando lugar en la pista...", color: "text-blue-300" },
        { text: "A tu novio/a no le va a gustar esto...", color: "text-red-400" },
        { text: "Dale que ya entras...", color: "text-orange-300" },
        { text: "Listo, pasá 😈", color: "text-fuchsia-200" },
      ];

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        setStageText(step.text);
        setStageColor(step.color);

        if (step.text.includes("novio")) {
          if (navigator.vibrate) {
            navigator.vibrate([50, 30, 50]);
          }
        }

        await new Promise((r) => setTimeout(r, i === steps.length - 1 ? 850 : 650));
      }

      if (navigator.vibrate) {
        navigator.vibrate([80, 40, 120, 40, 180]);
      }

      try {
        await audioRef.current?.play();
      } catch {
        // algunos navegadores bloquean audio
      }

      await new Promise((r) => setTimeout(r, 400));

      const redirectTo = `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      setError("Error al iniciar sesión.");
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
              {loading ? "Ingresando..." : "Continuar con Google"}
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

          {error && (
            <p className="text-center text-sm text-red-400">{error}</p>
          )}
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

            <h2
              className={`mt-6 font-bold transition-all duration-300 ${
                stageText.includes("novio")
                  ? "scale-110 text-2xl text-red-400 drop-shadow-[0_0_12px_rgba(248,113,113,0.55)]"
                  : `text-xl ${stageColor}`
              }`}
            >
              {stageText}
            </h2>

            <div className="mx-auto mt-4 h-2 w-44 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-2/3 animate-pulse bg-fuchsia-400 shadow-[0_0_20px_rgba(217,70,239,0.55)]" />
            </div>
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        preload="auto"
        src="/sounds/holy-access.mp3"
      />
    </main>
  );
}