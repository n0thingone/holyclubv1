"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardShell from "@/components/navigation/DashboardShell";
import { useAuth } from "@/context/AuthContext";
import {
  UserCircle2,
  Mail,
  ShieldCheck,
  LogOut,
  PencilLine,
  KeyRound,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function PerfilPage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const supabase = getSupabaseClient();

  const [displayName, setDisplayName] = useState(profile?.username ?? "");
  const [saving, setSaving] = useState(false);
  const [sendingPassword, setSendingPassword] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(profile?.username ?? "");
  }, [profile?.username]);

  const email = user?.email ?? profile?.email ?? "";
const credits = Number((profile as any)?.holy_points_balance ?? 0);

  const providerLabel = useMemo(() => {
    const provider =
      user?.app_metadata?.provider ||
      user?.identities?.[0]?.provider ||
      "email";

    if (provider === "google") return "Google";
    return provider;
  }, [user]);

  async function handleSaveName() {
    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      const cleanName = displayName.trim();

      if (!cleanName) {
        setError("Poné un nombre válido.");
        return;
      }

      const userId = user?.id ?? profile?.id;

      if (!userId) {
        setError("No se encontró el usuario.");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ username: cleanName })
        .eq("id", userId);

      if (error) throw error;

      await refreshProfile();
      setMessage("Nombre actualizado.");
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "No se pudo guardar el nombre.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordReset() {
    try {
      setSendingPassword(true);
      setError(null);
      setMessage(null);

      if (!email) {
        setError("No encontramos el email de la cuenta.");
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) throw error;

      setMessage("Te enviamos un mail para configurar o cambiar la contraseña.");
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "No se pudo enviar el mail.");
    } finally {
      setSendingPassword(false);
    }
  }

  async function handleLogout() {
    try {
      setLoggingOut(true);
      await signOut();
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/login";
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "No se pudo cerrar sesión.");
      setLoggingOut(false);
    }
  }

  return (
    <DashboardShell title="Perfil">
      <main className="mx-auto w-full max-w-6xl px-3 pb-28 pt-3 sm:px-4">
        <section className="overflow-hidden rounded-[30px] border border-fuchsia-500/20 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.16),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5 shadow-[0_0_40px_rgba(217,70,239,0.08)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[24px] border border-fuchsia-400/20 bg-fuchsia-500/10 shadow-[0_0_30px_rgba(217,70,239,0.18)]">
                <UserCircle2 className="h-9 w-9 text-fuchsia-300" />
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-fuchsia-300/90">
                  MI CUENTA
                </p>
                <h1 className="truncate text-2xl font-black text-white">
                  {profile?.username || user?.user_metadata?.given_name || "Usuario"}
                </h1>
                <p className="truncate text-sm text-white/55">{email || "Sin email"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
              <div className="rounded-2xl border border-fuchsia-400/15 bg-fuchsia-500/10 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-200/70">
                  Créditos
                </p>
                <p className="mt-1 text-lg font-black text-white">
                  {credits.toLocaleString("es-AR")}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200/70">
                  Acceso
                </p>
                <p className="mt-1 text-lg font-black text-white">{providerLabel}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <PencilLine className="h-5 w-5 text-white/80" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Datos de perfil</h2>
                <p className="text-sm text-white/50">
                  Editá cómo querés que te vea la app.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-white/45">
                  Nombre visible
                </label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-fuchsia-400/30"
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-white/55" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/45">
                      Email
                    </p>
                    <p className="text-sm text-white">{email || "Sin email"}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSaveName}
                disabled={saving}
                className="w-full rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/15 px-4 py-3 text-sm font-black text-white transition hover:bg-fuchsia-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar nombre"}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                  <ShieldCheck className="h-5 w-5 text-white/80" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Seguridad</h2>
                  <p className="text-sm text-white/50">
                    Acciones rápidas de tu cuenta.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handlePasswordReset}
                  disabled={sendingPassword}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-left transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <KeyRound className="h-5 w-5 text-fuchsia-300" />
                  <div>
                    <p className="text-sm font-black text-white">
                      Configurar / cambiar contraseña
                    </p>
                    <p className="text-xs text-white/45">
                      Te enviamos un mail con el enlace.
                    </p>
                  </div>
                </button>

                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex w-full items-center gap-3 rounded-2xl border border-red-400/15 bg-red-500/10 px-4 py-4 text-left transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LogOut className="h-5 w-5 text-red-300" />
                  <div>
                    <p className="text-sm font-black text-white">
                      {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
                    </p>
                    <p className="text-xs text-white/45">
                      Salir de la cuenta actual.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                  <Sparkles className="h-5 w-5 text-white/80" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Estado</h2>
                  <p className="text-sm text-white/50">
                    Resumen rápido de tu cuenta.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-3">
                    <WalletCards className="h-5 w-5 text-fuchsia-300" />
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/45">
                        Créditos actuales
                      </p>
                      <p className="text-base font-black text-white">
                        {credits.toLocaleString("es-AR")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/45">
                    Método de acceso
                  </p>
                  <p className="mt-1 text-base font-black text-white">{providerLabel}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {message ? (
          <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}
      </main>
    </DashboardShell>
  );
}