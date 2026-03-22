"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

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

export default function AdminPointsPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { profile, loading } = useAuth();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("Carga manual admin");
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"credit" | "debit">("credit");

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

    const { data, error } = await supabase.rpc("search_profiles_for_admin", {
      p_query: q,
    });

    setSearching(false);

    if (error) {
      setError(error.message);
      setResults([]);
      return;
    }

    setResults((data || []) as SearchUser[]);
  }

  async function loadMovements(userId: string) {
    const { data, error } = await supabase.rpc("get_points_movements_for_admin", {
      p_user_id: userId,
    });

    if (error) {
      setError(error.message);
      setMovements([]);
      return;
    }

    setMovements((data || []) as Movement[]);
  }

  async function selectUser(user: SearchUser) {
    setSelectedUser(user);
    await loadMovements(user.id);
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

    const newBalance = Number((data as any)?.new_balance ?? selectedUser.holy_points_balance);

    setSelectedUser((prev) =>
      prev ? { ...prev, holy_points_balance: newBalance } : prev
    );

    setResults((prev) =>
      prev.map((u) =>
        u.id === selectedUser.id ? { ...u, holy_points_balance: newBalance } : u
      )
    );

    setAmount("");
    setNote("");

    await loadMovements(selectedUser.id);
  }

  useEffect(() => {
    if (!loading && isAllowed) {
      handleSearch("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAllowed]);

  if (loading) {
    return <div className="p-6 text-white">Cargando...</div>;
  }

  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
        <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <h1 className="text-2xl font-bold mb-2">Acceso restringido</h1>
          <p className="text-white/70">
            Solo admin o n0thing pueden gestionar créditos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[380px,1fr] gap-6">
        {/* Columna izquierda */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 md:p-5">
          <h1 className="text-2xl font-bold mb-4">Gestión de créditos</h1>

          <div className="space-y-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, mail, DNI o username"
              className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
            />

            <button
              onClick={() => handleSearch()}
              disabled={searching}
              className="w-full rounded-2xl bg-white text-black font-semibold py-3 disabled:opacity-50"
            >
              {searching ? "Buscando..." : "Buscar usuario"}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="mt-5 space-y-3 max-h-[60vh] overflow-auto pr-1">
            {results.map((user) => {
              const active = selectedUser?.id === user.id;
              return (
                <button
                  key={user.id}
                  onClick={() => selectUser(user)}
                  className={`w-full text-left rounded-2xl p-4 border transition ${
                    active
                      ? "border-white bg-white text-black"
                      : "border-white/10 bg-black/30 hover:bg-white/10"
                  }`}
                >
                  <div className="font-semibold text-base">
                    {user.full_name || "Sin nombre"}
                  </div>
                  <div className={`text-sm ${active ? "text-black/70" : "text-white/60"}`}>
                    {user.email || "Sin mail"}
                  </div>
                  <div className={`text-sm ${active ? "text-black/70" : "text-white/60"}`}>
                    DNI: {user.dni || "—"}
                  </div>
                  <div className="mt-2 text-sm font-semibold">
                    Créditos: {user.holy_points_balance.toLocaleString("es-AR")}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Columna derecha */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 md:p-6">
          {!selectedUser ? (
            <div className="h-full min-h-[400px] flex items-center justify-center text-white/60">
              Seleccioná un usuario para ver saldo e historial.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <div className="text-sm text-white/60">Usuario seleccionado</div>
                <div className="text-2xl font-bold mt-1">
                  {selectedUser.full_name || "Sin nombre"}
                </div>
                <div className="text-white/60 mt-1">{selectedUser.email || "Sin mail"}</div>
                <div className="text-white/60">DNI: {selectedUser.dni || "—"}</div>

                <div className="mt-5">
                  <div className="text-sm text-white/60">Balance actual</div>
                  <div className="text-4xl font-extrabold">
                    {selectedUser.holy_points_balance.toLocaleString("es-AR")} CRÉDITOS
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <div className="text-xl font-bold mb-4">Ajuste manual</div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={() => setMode("credit")}
                    className={`rounded-2xl py-3 font-semibold border ${
                      mode === "credit"
                        ? "bg-white text-black border-white"
                        : "border-white/10 bg-black/30"
                    }`}
                  >
                    Sumar créditos
                  </button>

                  <button
                    onClick={() => setMode("debit")}
                    className={`rounded-2xl py-3 font-semibold border ${
                      mode === "debit"
                        ? "bg-white text-black border-white"
                        : "border-white/10 bg-black/30"
                    }`}
                  >
                    Restar créditos
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="Cantidad"
                    className="rounded-2xl bg-black/40 border border-white/10 px-4 py-3 outline-none"
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
                    className="rounded-2xl bg-black/40 border border-white/10 px-4 py-3 outline-none"
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

              <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <div className="text-xl font-bold mb-4">Historial</div>

                <div className="space-y-3">
                  {movements.length === 0 && (
                    <div className="text-white/60">No hay movimientos todavía.</div>
                  )}

                  {movements.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-2xl border border-white/10 bg-black/40 p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div
                            className={`font-bold ${
                              m.movement_type === "credit"
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {m.movement_type === "credit" ? "+" : "-"}
                            {m.amount.toLocaleString("es-AR")} créditos
                          </div>
                          <div className="text-sm text-white/80">{m.reason}</div>
                          {m.note && (
                            <div className="text-sm text-white/60 mt-1">{m.note}</div>
                          )}
                        </div>

                        <div className="text-right text-sm text-white/60">
                          <div>Saldo: {m.balance_after.toLocaleString("es-AR")}</div>
                          <div>Por: {m.created_by_label || "Sistema"}</div>
                          <div>{new Date(m.created_at).toLocaleString("es-AR")}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}