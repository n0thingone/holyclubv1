"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const ranRef = useRef(false);
  const [message, setMessage] = useState("Procesando login.");
  const [debug, setDebug] = useState("");

  function goAfterLogin() {
    const redirect =
      localStorage.getItem("holy_redirect") || "/dashboard/puntos/home";

    localStorage.removeItem("holy_redirect");

    router.replace(redirect);
  }

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const supabase = getSupabaseClient();

    async function run() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        const hash = window.location.hash;
        const hashParams = new URLSearchParams(hash.replace("#", ""));
        const accessToken = hashParams.get("access_token");

        console.log("CALLBACK URL:", window.location.href);
        console.log("CODE:", code);
        console.log("HASH TOKEN:", accessToken);

        setMessage("Verificando sesión...");

        const {
          data: { session: existingSession },
          error: existingSessionError,
        } = await supabase.auth.getSession();

        if (existingSessionError) {
          console.error("getSession error:", existingSessionError);
        }

        if (existingSession?.user) {
          goAfterLogin();
          return;
        }

        if (code) {
          setMessage("Intercambiando sesión...");

          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error("exchangeCodeForSession error:", error);
            setMessage("No se pudo completar el login");
            setDebug(error.message);
            return;
          }

          goAfterLogin();
          return;
        }

        if (accessToken) {
          setMessage("Detectando sesión...");

          await new Promise((resolve) => setTimeout(resolve, 700));

          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (sessionError) {
            console.error("getSession hash error:", sessionError);
            setMessage("No se pudo completar el login");
            setDebug(sessionError.message);
            return;
          }

          if (session?.user) {
            goAfterLogin();
            return;
          }

          setMessage("No se pudo completar el login");
          setDebug("Se detectó token, pero no se creó la sesión.");
          return;
        }

        setMessage("Esperando confirmación de login...");

        await new Promise((resolve) => setTimeout(resolve, 1200));

        const {
          data: { session: delayedSession },
          error: delayedSessionError,
        } = await supabase.auth.getSession();

        if (delayedSessionError) {
          console.error("delayed getSession error:", delayedSessionError);
        }

        if (delayedSession?.user) {
          goAfterLogin();
          return;
        }

        setMessage("No se pudo identificar login");
        setDebug("Ni code ni access_token encontrados, y no hay sesión activa.");
      } catch (err: any) {
        console.error("Callback error:", err);
        setMessage("Error en callback");
        setDebug(err?.message || "Error desconocido");
      }
    }

    run();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/5 p-6 text-center backdrop-blur-xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-fuchsia-300">
          HOLY AUTH
        </p>

        <h1 className="mt-3 text-2xl font-black">Procesando login</h1>
        <p className="mt-3 text-sm text-white/70">{message}</p>

        {debug && (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">
            {debug}
          </div>
        )}
      </div>
    </main>
  );
}