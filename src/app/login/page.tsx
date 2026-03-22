"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff, Zap } from "lucide-react";

const USERNAME_MAP: Record<string, string> = {
  n0thing: "n0thing@holyclub.com",
  franco: "franco@holyclub.com",
  claudia: "claudia@holyclub.com",
  diego: "diego@holyclub.com",
  kiara: "kiara@holyclub.com",
  agustin: "agustin@holyclub.com",
  matias: "matias@holyclub.com",
  valentin: "valentin@holyclub.com",
  anto: "anto@holyclub.com",
  camila: "camila@holyclub.com",
  julieta: "julieta@holyclub.com",
  antonella: "antonella@holyclub.com",
  abril: "abril@holyclub.com",
  valen: "valen@holyclub.com",
  maar: "maar@holyclub.com",
  celina: "celina@holyclub.com",
  azul: "azul@holyclub.com",
  lucia: "lucia@holyclub.com",
  josema: "josema@holyclub.com",
};

function resolveEmail(input: string): string {
  const lower = input.toLowerCase().trim();
  return USERNAME_MAP[lower] ?? (input.includes("@") ? input : `${lower}@holyclub.com`);
}

function getDestination(role?: string | null) {
  if (role === "cashier") return "/dashboard/scanner";
  if (role === "bar") return "/dashboard/bar";
  if (role === "rrpp") return "/rrpp";
  return "/dashboard";
}

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && profile) {
      router.replace(getDestination(profile.role));
    }
  }, [profile, loading, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (submitting) return;

    setSubmitting(true);
    setError("");

    const supabase = getSupabaseClient();

    try {
      const email = resolveEmail(identifier);

      await supabase.auth.signOut();

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error("[LOGIN_ERROR]", authError);
        setError("Usuario o contraseña incorrectos");
        setSubmitting(false);
        return;
      }

      const session = data.session;

      if (!session?.user?.email) {
        setError("No se pudo crear la sesión");
        setSubmitting(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("email", session.user.email)
        .maybeSingle();

      if (profileError) {
        console.error("[PROFILE_ROLE_ERROR]", profileError);
        setError("La sesión se creó, pero no se pudo cargar el perfil");
        setSubmitting(false);
        return;
      }

      router.replace(getDestination(profileData?.role));
      router.refresh();
    } catch (err) {
      console.error("[LOGIN_FATAL]", err);
      setError("Error al iniciar sesión");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background mesh-bg px-4">
      <div className="mb-10 text-center animate-fade-in">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-purple shadow-purple mb-4">
          <Zap className="w-10 h-10 text-black" fill="black" />
        </div>

        <h1 className="font-display text-5xl font-black tracking-widest text-white glow-text">
          HOLY
        </h1>

        <p className="text-text-muted text-xs tracking-[0.4em] uppercase mt-2">
          Club System · Staff Only
        </p>
      </div>

      <div className="w-full max-w-sm animate-slide-up">
        <div className="holy-card">
          <form onSubmit={handleLogin} className="space-y-4">

            <div>
              <label className="holy-label">Usuario</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="holy-input"
                placeholder="Ingrese su cuenta"
                required
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="holy-label">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="holy-input pr-12"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-accent-purple transition-colors p-1"
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-danger text-sm animate-scale-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || loading}
              className="holy-btn-primary mt-2"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Ingresando...
                </span>
              ) : (
                "ENTRAR"
              )}
            </button>

          </form>
        </div>

        <p className="text-center text-text-muted/40 text-xs mt-8 tracking-widest uppercase">
          © Holy Club — Uso interno
        </p>
      </div>
    </div>
  );
}