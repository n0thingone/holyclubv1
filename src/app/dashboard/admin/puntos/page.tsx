"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Search, Users, SlidersHorizontal, History, ShieldCheck } from "lucide-react";

type SearchUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  dni: string | null;
  holy_points_balance: number;
  role: string | null;
  username: string | null;
};

type Movement = {
  id: string;
  amount: number;
  movement_type: "credit" | "debit";
  reason: string;
  note: string | null;
  balance_after: number;
  created_by: string | null;
  created_by_label: string | null;
  created_at: string;
};

type RoleOption = "admin" | "rrpp" | "cashier" | "cliente";
type TabKey = "users" | "settings" | "history";

const ROLE_OPTIONS: RoleOption[] = ["cliente", "rrpp", "cashier", "admin"];

export default function AdminPointsPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { profile, loading, refreshProfile } = useAuth() as any;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roleSaving, setRoleSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleMessage, setRoleMessage] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("Carga manual admin");
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"credit" | "debit">("credit");
  const [selectedRole, setSelectedRole] = useState<RoleOption>("cliente");
  const [activeTab, setActiveTab] = useState<TabKey>("users");

  const isAllowed = useMemo(() => {
    const role = String((profile as any)?.role || "").toLowerCase();
    const username = String((profile as any)?.username || "").toLowerCase();
    const email = String((profile as any)?.email || "").toLowerCase();

    return (
      role === "admin" ||
      username === "n0thing" ||
      email.startsWith("n0thing@")
    );
  }, [profile]);

  async function handleSearch(forceQuery?: string) {
    const q = (forceQuery ?? query).trim();
    setSearching(true);
    setError(null);

  const { data, error } = await (supabase as any).rpc("search_profiles_for_admin", {
  p_query: q,
});

    setSearching(false);

    if (error) {
      setError(error.message);
      setResults([]);
      return;
    }

    const parsed = ((data || []) as any[]).map((u) => ({
      ...u,
      holy_points_balance: Number(u.holy_points_balance ?? u.holy_points ?? 0),
      role: u.role ?? "cliente",
    })) as SearchUser[];

    setResults(parsed);

    if (selectedUser) {
      const updatedSelected =
        parsed.find((u) => u.id === selectedUser.id) || null;

      if (updatedSelected) {
        setSelectedUser(updatedSelected);
        setSelectedRole(
          (updatedSelected.role as RoleOption | null) ?? "cliente"
        );
      }
    }
  }

  async function loadMovements(userId: string) {
    setError(null);

  const { data, error } = await (supabase as any).rpc(
  "get_points_movements_for_admin",
  {
    p_user_id: userId,
  }
);

    if (error) {
      setError(error.message);
      setMovements([]);
      return;
    }

    setMovements((data || []) as Movement[]);
  }

  async function selectUser(user: SearchUser) {
    setSelectedUser(user);
    setSelectedRole((user.role as RoleOption | null) ?? "cliente");
    setRoleMessage(null);
    setError(null);
    await loadMovements(user.id);
    setActiveTab("settings");
  }

  async function submitAdjustment() {
    if (!selectedUser) return;

    const numeric = Number(amount);

    if (!numeric || numeric <= 0) {
      setError("Poné una cantidad válida.");
      return;
    }

    if (!reason.trim()) {
      setError("Poné un motivo.");
      return;
    }

    setSaving(true);
    setError(null);

    const signedAmount = mode === "credit" ? numeric : -numeric;

    const { data, error } = await supabase.rpc("adjust_holy_points", {
      p_user_id: selectedUser.id,
      p_amount: signedAmount,
      p_reason: reason.trim(),
      p_note: note.trim() || null,
    });

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    const newBalance = Number(
      (data as any)?.new_balance ??
        (data as any)?.balance_after ??
        selectedUser.holy_points_balance
    );

    setSelectedUser((prev) =>
      prev ? { ...prev, holy_points_balance: newBalance } : prev
    );

    setResults((prev) =>
      prev.map((u) =>
        u.id === selectedUser.id
          ? { ...u, holy_points_balance: newBalance }
          : u
      )
    );

    setAmount("");
    setNote("");

    await loadMovements(selectedUser.id);

    if (typeof refreshProfile === "function") {
      try {
        await refreshProfile();
      } catch {
        // noop
      }
    }
  }

  async function submitRoleUpdate() {
    if (!selectedUser) return;

    setRoleSaving(true);
    setRoleMessage(null);
    setError(null);

    const { data, error } = await supabase.rpc("set_user_role", {
      p_user_id: selectedUser.id,
      p_role: selectedRole,
    });

    setRoleSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (!(data as any)?.ok) {
      setError((data as any)?.message || "No se pudo actualizar el rol.");
      return;
    }

    const updatedRole = selectedRole;

    setSelectedUser((prev) => (prev ? { ...prev, role: updatedRole } : prev));

    setResults((prev) =>
      prev.map((u) =>
        u.id === selectedUser.id ? { ...u, role: updatedRole } : u
      )
    );

    setRoleMessage("Rol actualizado correctamente.");

    if (typeof refreshProfile === "function") {
      try {
        await refreshProfile();
      } catch {
        // noop
      }
    }
  }

  useEffect(() => {
    if (!loading && isAllowed) {
      handleSearch("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAllowed]);

  function tabButtonClasses(tab: TabKey) {
    const active = activeTab === tab;

    return [
      "flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition border",
      active
        ? "bg-white text-black border-white shadow-[0_0_24px_rgba(255,255,255,0.10)]"
        : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white",
    ].join(" ");
  }

  function roleBadge(role: string | null | undefined) {
    const value = String(role || "cliente").toLowerCase();

    if (value === "admin") {
      return "bg-red-500/15 text-red-300 border-red-500/20";
    }
    if (value === "rrpp") {
      return "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/20";
    }
    if (value === "cashier") {
      return "bg-cyan-500/15 text-cyan-300 border-cyan-500/20";
    }
    return "bg-white/10 text-white/75 border-white/10";
  }

  if (loading) {
    return <div className="p-6 text-white">Cargando...</div>;
  }

  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
        <div className="max-w-md w-full rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
          <h1 className="text-2xl font-bold mb-2">Acceso restringido</h1>
          <p className="text-white/70">
            Solo admin o n0thing pueden gestionar créditos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/8 to-white/[0.03] p-5 md:p-6 shadow-[0_0_40px_rgba(255,255,255,0.04)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-white/50 text-sm mb-1">Panel ADMIN</div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                Gestión de créditos
              </h1>
              <p className="text-white/60 text-sm mt-2">
                Buscá usuarios, cambiá roles y ajustá saldos sin volverte loco en mobile.
              </p>
            </div>

            {selectedUser && (
              <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 md:min-w-[320px]">
                <div className="text-xs uppercase tracking-wide text-white/45">
                  Usuario activo
                </div>
                <div className="mt-1 font-bold text-lg">
                  {selectedUser.full_name || "Sin nombre"}
                </div>
                <div className="text-sm text-white/60 truncate">
                  {selectedUser.email || "Sin mail"}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 md:gap-3">
          <button
            onClick={() => setActiveTab("users")}
            className={tabButtonClasses("users")}
          >
            <Users className="h-4 w-4" />
            Usuarios
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={tabButtonClasses("settings")}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Ajustes
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={tabButtonClasses("history")}
          >
            <History className="h-4 w-4" />
            Historial
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-red-200 text-sm">
            {error}
          </div>
        )}

        {roleMessage && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-200 text-sm">
            {roleMessage}
          </div>
        )}

        {activeTab === "users" && (
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-2xl bg-white/10 p-3">
                <Search className="h-5 w-5 text-white/80" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Usuarios</h2>
                <p className="text-sm text-white/55">
                  Elegí la cuenta que querés administrar.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr,180px] gap-3 mb-5">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre, mail, DNI o username"
                className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 outline-none text-white placeholder:text-white/30"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
              />

              <button
                onClick={() => handleSearch()}
                disabled={searching}
                className="rounded-2xl bg-white text-black font-semibold py-3 disabled:opacity-50"
              >
                {searching ? "Buscando..." : "Buscar usuario"}
              </button>
            </div>

            <div className="space-y-3 max-h-[65vh] overflow-auto pr-1">
              {results.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-white/55 text-sm">
                  No hay usuarios para mostrar.
                </div>
              )}

              {results.map((user) => {
                const active = selectedUser?.id === user.id;

                return (
                  <button
                    key={user.id}
                    onClick={() => selectUser(user)}
                    className={`w-full text-left rounded-3xl p-4 border transition ${
                      active
                        ? "border-white bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.10)]"
                        : "border-white/10 bg-black/30 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-base truncate">
                          {user.full_name || "Sin nombre"}
                        </div>

                        <div
                          className={`text-sm truncate ${
                            active ? "text-black/70" : "text-white/60"
                          }`}
                        >
                          {user.email || "Sin mail"}
                        </div>

                        <div
                          className={`text-sm ${
                            active ? "text-black/70" : "text-white/55"
                          }`}
                        >
                          DNI: {user.dni || "—"}
                        </div>
                      </div>

                      <div
                        className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
                          active
                            ? "border-black/10 bg-black/10 text-black/75"
                            : roleBadge(user.role)
                        }`}
                      >
                        {user.role || "cliente"}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold">
                        Créditos:{" "}
                        {Number(user.holy_points_balance ?? 0).toLocaleString(
                          "es-AR"
                        )}
                      </div>

                      <div
                        className={`text-xs font-medium ${
                          active ? "text-black/60" : "text-white/40"
                        }`}
                      >
                        Tocar para administrar
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === "settings" && (
          <section className="space-y-5">
            {!selectedUser ? (
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 text-center text-white/60">
                Seleccioná un usuario desde la pestaña <b>Usuarios</b>.
              </div>
            ) : (
              <>
                <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 md:p-6 shadow-[0_0_30px_rgba(255,255,255,0.03)]">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm text-white/50">Usuario seleccionado</div>
                      <div className="text-2xl md:text-3xl font-extrabold mt-1 truncate">
                        {selectedUser.full_name || "Sin nombre"}
                      </div>
                      <div className="text-white/60 mt-1 truncate">
                        {selectedUser.email || "Sin mail"}
                      </div>
                      <div className="text-white/50 text-sm mt-1">
                        DNI: {selectedUser.dni || "—"}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div
                        className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${roleBadge(
                          selectedUser.role
                        )}`}
                      >
                        Rol actual: {selectedUser.role || "cliente"}
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                        <div className="text-xs uppercase tracking-wide text-white/45">
                          Balance actual
                        </div>
                        <div className="text-2xl font-extrabold">
                          {Number(
                            selectedUser.holy_points_balance ?? 0
                          ).toLocaleString("es-AR")}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 md:p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="rounded-2xl bg-fuchsia-500/10 p-3">
                      <ShieldCheck className="h-5 w-5 text-fuchsia-300" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Cambiar rol</h2>
                      <p className="text-sm text-white/55">
                        Ideal para convertir cuentas en RRPP y testear paneles.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr,220px] gap-3">
                    <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white/80">
                      {selectedUser.full_name || "Sin nombre"} ·{" "}
                      {selectedUser.email || "Sin mail"}
                    </div>

                    <select
                      value={selectedRole}
                      onChange={(e) =>
                        setSelectedRole(e.target.value as RoleOption)
                      }
                      className="rounded-2xl bg-black/40 border border-white/10 px-4 py-3 outline-none"
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={submitRoleUpdate}
                    disabled={roleSaving}
                    className="mt-4 rounded-2xl bg-white text-black font-bold px-5 py-3 disabled:opacity-50"
                  >
                    {roleSaving ? "Actualizando rol..." : "Actualizar rol"}
                  </button>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 md:p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="rounded-2xl bg-yellow-500/10 p-3">
                      <SlidersHorizontal className="h-5 w-5 text-yellow-300" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Ajuste manual</h2>
                      <p className="text-sm text-white/55">
                        Sumá o restá créditos con motivo y nota.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      onClick={() => setMode("credit")}
                      className={`rounded-2xl py-3 font-semibold border transition ${
                        mode === "credit"
                          ? "bg-white text-black border-white"
                          : "border-white/10 bg-black/30 hover:bg-white/10"
                      }`}
                    >
                      Sumar créditos
                    </button>

                    <button
                      onClick={() => setMode("debit")}
                      className={`rounded-2xl py-3 font-semibold border transition ${
                        mode === "debit"
                          ? "bg-white text-black border-white"
                          : "border-white/10 bg-black/30 hover:bg-white/10"
                      }`}
                    >
                      Restar créditos
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                    <input
                      value={amount}
                      onChange={(e) =>
                        setAmount(e.target.value.replace(/[^\d]/g, ""))
                      }
                      placeholder="Cantidad"
                      className="rounded-2xl bg-black/40 border border-white/10 px-4 py-3 outline-none placeholder:text-white/30"
                    />

                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="rounded-2xl bg-black/40 border border-white/10 px-4 py-3 outline-none"
                    >
                      <option value="Carga manual admin">Carga manual admin</option>
                      <option value="Promo">Promo</option>
                      <option value="Regalo">Regalo</option>
                      <option value="Compensación">Compensación</option>
                      <option value="Ajuste manual">Ajuste manual</option>
                      <option value="Canje manual">Canje manual</option>
                      <option value="Error de carga">Error de carga</option>
                    </select>

                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Nota opcional"
                      className="rounded-2xl bg-black/40 border border-white/10 px-4 py-3 outline-none placeholder:text-white/30"
                    />
                  </div>

                  <button
                    onClick={submitAdjustment}
                    disabled={saving}
                    className="mt-4 rounded-2xl bg-white text-black font-bold px-5 py-3 disabled:opacity-50"
                  >
                    {saving
                      ? "Guardando..."
                      : mode === "credit"
                      ? "Confirmar suma"
                      : "Confirmar descuento"}
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {activeTab === "history" && (
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 md:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-2xl bg-cyan-500/10 p-3">
                <History className="h-5 w-5 text-cyan-300" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Historial</h2>
                <p className="text-sm text-white/55">
                  Movimientos de la cuenta seleccionada.
                </p>
              </div>
            </div>

            {!selectedUser ? (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-white/60">
                Primero seleccioná un usuario desde la pestaña <b>Usuarios</b>.
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4 mb-4">
                  <div className="font-semibold">
                    {selectedUser.full_name || "Sin nombre"}
                  </div>
                  <div className="text-sm text-white/55">
                    {selectedUser.email || "Sin mail"}
                  </div>
                </div>

                <div className="space-y-3">
                  {movements.length === 0 && (
                    <div className="text-white/60">No hay movimientos todavía.</div>
                  )}

                  {movements.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-2xl border border-white/10 bg-black/40 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div
                            className={`font-bold ${
                              m.movement_type === "credit"
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {m.movement_type === "credit" ? "+" : "-"}
                            {Math.abs(Number(m.amount)).toLocaleString("es-AR")} créditos
                          </div>

                          <div className="text-sm text-white/80 mt-1">{m.reason}</div>

                          {m.note && (
                            <div className="text-sm text-white/55 mt-1">{m.note}</div>
                          )}
                        </div>

                        <div className="text-right text-xs md:text-sm text-white/55 shrink-0">
                          <div>
                            Saldo: {Number(m.balance_after ?? 0).toLocaleString("es-AR")}
                          </div>
                          <div>Por: {m.created_by_label || "Sistema"}</div>
                          <div>{new Date(m.created_at).toLocaleString("es-AR")}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}