// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Trophy,
  Lock,
  Unlock,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  RefreshCcw,
  Medal,
} from "lucide-react";

import DashboardShell from "@/components/navigation/DashboardShell";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

type MatchRow = {
  id: string;
  home_team: string;
  away_team: string;
  home_flag: string | null;
  away_flag: string | null;
  kickoff_at: string;
  voting_closes_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  display_order: number;
};

function normalizeFlagKey(value?: string | null) {
  return String(value || "").trim().toUpperCase();
}

function getFlagCode(team: string, flag?: string | null) {
  const valueKey = normalizeFlagKey(flag);
  const teamKey = normalizeFlagKey(team);
  const key = valueKey || teamKey;

  if (key === "AR" || key === "ARG" || key === "ARGENTINA") return "ar";
  if (key === "DZ" || key === "DZA" || key === "ARGELIA") return "dz";
  if (key === "AT" || key === "AUT" || key === "AUSTRIA") return "at";
  if (key === "JO" || key === "JOR" || key === "JORDANIA") return "jo";

  if (teamKey === "ARGENTINA") return "ar";
  if (teamKey === "ARGELIA") return "dz";
  if (teamKey === "AUSTRIA") return "at";
  if (teamKey === "JORDANIA") return "jo";

  return null;
}

function FlagIcon({
  team,
  flag,
}: {
  team: string;
  flag?: string | null;
}) {
  const code = getFlagCode(team, flag);

  if (!code) {
    return (
      <div className="flex h-8 w-10 items-center justify-center rounded-xl border border-yellow-300/20 bg-yellow-300/10 text-xl">
        🏆
      </div>
    );
  }

  return (
    <img
      src={`https://flagcdn.com/w80/${code}.png`}
      alt={team}
      className="h-8 w-10 rounded-xl object-cover shadow"
    />
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function getStatusLabel(status: string) {
  if (status === "open") return "Abierto";
  if (status === "locked") return "Bloqueado";
  if (status === "conditional") return "Condicional";
  if (status === "finished") return "Finalizado";
  return status;
}

function getStatusClass(status: string) {
  if (status === "open") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  }

  if (status === "finished") {
    return "border-yellow-400/30 bg-yellow-400/10 text-yellow-200";
  }

  if (status === "conditional") {
    return "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-200";
  }

  return "border-white/10 bg-white/8 text-white/60";
}

export default function AdminMundialPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { profile } = useAuth();

  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [homeScores, setHomeScores] = useState<Record<string, string>>({});
  const [awayScores, setAwayScores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const role = String((profile as any)?.role || "").toLowerCase();
  const isAdmin = role === "admin" || role === "cashier" || role === "cajero";

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setMessage("");
    setErrorMessage("");

    const { data: matchesData, error: matchesError } = await supabase
      .from("worldcup_matches_public")
      .select("*")
      .order("display_order", { ascending: true });

    if (matchesError) {
      console.error("Error cargando partidos:", matchesError);
      setErrorMessage("No se pudieron cargar los partidos.");
      setLoading(false);
      return;
    }

    const loadedMatches = (matchesData ?? []) as MatchRow[];
    setMatches(loadedMatches);

    const nextHomeScores: Record<string, string> = {};
    const nextAwayScores: Record<string, string> = {};

    loadedMatches.forEach((match) => {
      nextHomeScores[match.id] =
        match.home_score !== null && match.home_score !== undefined
          ? String(match.home_score)
          : "";

      nextAwayScores[match.id] =
        match.away_score !== null && match.away_score !== undefined
          ? String(match.away_score)
          : "";
    });

    setHomeScores(nextHomeScores);
    setAwayScores(nextAwayScores);

    const { data: predictionsData, error: predictionsError } = await supabase
      .from("worldcup_predictions")
      .select("match_id");

    if (predictionsError) {
      console.error("Error cargando votos:", predictionsError);
      setStats({});
    } else {
      const counts: Record<string, number> = {};

      (predictionsData ?? []).forEach((row: any) => {
        counts[row.match_id] = (counts[row.match_id] ?? 0) + 1;
      });

      setStats(counts);
    }

    setLoading(false);
  }

  async function changeStatus(matchId: string, status: string) {
    setWorkingId(matchId);
    setMessage("");
    setErrorMessage("");

    const { data: rpcData, error } = await supabase.rpc(
      "set_worldcup_match_status" as any,
      {
        p_match_id: matchId,
        p_status: status,
      } as any
    );

    const data = rpcData as {
      success?: boolean;
      error?: string;
      status?: string;
    } | null;

    if (error) {
      console.error("Error cambiando estado:", error);
      setErrorMessage("No se pudo cambiar el estado.");
      setWorkingId(null);
      return;
    }

    if (!data?.success) {
      setErrorMessage(
        data?.error === "not_admin"
          ? "No tenés permisos de admin."
          : "No se pudo cambiar el estado."
      );
      setWorkingId(null);
      return;
    }

    setMessage(`Estado actualizado: ${getStatusLabel(status)}.`);
    await loadData();
    setWorkingId(null);
  }

  async function finishMatch(match: MatchRow) {
    setMessage("");
    setErrorMessage("");

    const home = Number(homeScores[match.id]);
    const away = Number(awayScores[match.id]);

    if (!Number.isInteger(home) || !Number.isInteger(away)) {
      setErrorMessage("Poné un resultado válido.");
      return;
    }

    if (home < 0 || away < 0) {
      setErrorMessage("El resultado no puede ser negativo.");
      return;
    }

    const confirmed = window.confirm(
      `¿Finalizar y premiar ${match.home_team} ${home} - ${away} ${match.away_team}?\n\nEsto suma créditos reales y no se debería repetir.`
    );

    if (!confirmed) return;

    setWorkingId(match.id);

    const { data: rpcData, error } = await supabase.rpc(
      "finish_worldcup_match" as any,
      {
        p_match_id: match.id,
        p_home_score: home,
        p_away_score: away,
      } as any
    );

    const data = rpcData as {
      success?: boolean;
      error?: string;
      participation_rewards?: number;
      exact_score_winners?: number;
      total_points_awarded?: number;
    } | null;

    if (error) {
      console.error("Error finalizando partido:", error);
      setErrorMessage("No se pudo finalizar el partido.");
      setWorkingId(null);
      return;
    }

    if (!data?.success) {
      setErrorMessage(
        data?.error === "not_admin"
          ? "No tenés permisos de admin."
          : "No se pudo finalizar el partido."
      );
      setWorkingId(null);
      return;
    }

    setMessage(
      `Partido finalizado. Participantes: ${data.participation_rewards ?? 0}. Exactos: ${data.exact_score_winners ?? 0}. Puntos entregados: ${(data.total_points_awarded ?? 0).toLocaleString("es-AR")}.`
    );

    await loadData();
    setWorkingId(null);
  }

  if (!isAdmin) {
    return (
      <DashboardShell title="Admin Mundial">
        <div className="px-3 pb-24 pt-3 text-white">
          <div className="rounded-[26px] border border-red-400/20 bg-red-500/10 p-5 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-red-200" />
            <h1 className="mt-3 text-xl font-black">Sin permisos</h1>
            <p className="mt-1 text-sm text-white/55">
              Esta pantalla es solo para admin.
            </p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Admin Mundial">
      <div className="px-3 pb-24 pt-3 text-white">
        <div className="space-y-4">
          <section className="relative overflow-hidden rounded-[28px] border border-yellow-300/20 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(217,70,239,0.18),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-4 shadow-[0_0_35px_rgba(250,204,21,0.08)]">
            <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-yellow-400/15 blur-3xl" />

            <div className="relative z-10 flex items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-yellow-300/20 bg-yellow-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-yellow-200">
                  <Trophy className="h-3.5 w-3.5" />
                  Mundial
                </div>

                <h1 className="mt-3 text-2xl font-black">
                  Admin HOLY Mundial
                </h1>

                <p className="mt-1 text-sm font-bold text-white/50">
                  Abrí votaciones, cargá resultados y premiá créditos.
                </p>
              </div>

              <button
                onClick={loadData}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-white/80 active:scale-95"
              >
                <RefreshCcw className="h-5 w-5" />
              </button>
            </div>
          </section>

          {message ? (
            <div className="rounded-[22px] border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100">
              {message}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-[22px] border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-100">
              {errorMessage}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-[26px] border border-white/10 bg-white/5 p-5 text-center text-white/50">
              Cargando partidos...
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((match) => {
                const working = workingId === match.id;
                const votes = stats[match.id] ?? 0;

                return (
                  <div
                    key={match.id}
                    className="overflow-hidden rounded-[26px] border border-violet-300/15 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))]"
                  >
                    <div className="border-b border-white/10 bg-white/[0.035] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-violet-200/70">
                            Partido #{match.display_order}
                          </p>

                          <div className="mt-2 flex items-center gap-2">
                            <FlagIcon team={match.home_team} flag={match.home_flag} />
                            <span className="text-sm font-black text-white">
                              {match.home_team}
                            </span>
                            <span className="text-[10px] font-black text-white/35">
                              VS
                            </span>
                            <span className="text-sm font-black text-white">
                              {match.away_team}
                            </span>
                            <FlagIcon team={match.away_team} flag={match.away_flag} />
                          </div>

                          <p className="mt-2 text-[11px] font-bold capitalize text-white/45">
                            {formatDate(match.kickoff_at)} hs
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase ${getStatusClass(match.status)}`}>
                            {getStatusLabel(match.status)}
                          </span>

                          <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[9px] font-black uppercase text-white/55">
                            {votes} votos
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 p-3">
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          disabled={working || match.status === "open"}
                          onClick={() => changeStatus(match.id, "open")}
                          className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-2 py-3 text-[11px] font-black text-emerald-100 disabled:opacity-35"
                        >
                          <Unlock className="mx-auto mb-1 h-4 w-4" />
                          Abrir
                        </button>

                        <button
                          disabled={working || match.status === "locked"}
                          onClick={() => changeStatus(match.id, "locked")}
                          className="rounded-2xl border border-white/10 bg-white/8 px-2 py-3 text-[11px] font-black text-white/70 disabled:opacity-35"
                        >
                          <Lock className="mx-auto mb-1 h-4 w-4" />
                          Bloquear
                        </button>

                        <button
                          disabled={working || match.status === "conditional"}
                          onClick={() => changeStatus(match.id, "conditional")}
                          className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10 px-2 py-3 text-[11px] font-black text-fuchsia-100 disabled:opacity-35"
                        >
                          <Clock3 className="mx-auto mb-1 h-4 w-4" />
                          Condicional
                        </button>
                      </div>

                      <div className="rounded-[22px] border border-yellow-300/15 bg-yellow-300/8 p-3">
                        <div className="mb-3 flex items-center gap-2">
                          <Medal className="h-4 w-4 text-yellow-200" />
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-100/75">
                            Resultado final
                          </p>
                        </div>

                        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                          <label className="block text-center">
                            <span className="block truncate text-[11px] font-black text-white/70">
                              {match.home_team}
                            </span>
                            <input
                              value={homeScores[match.id] ?? ""}
                              onChange={(e) =>
                                setHomeScores((prev) => ({
                                  ...prev,
                                  [match.id]: e.target.value,
                                }))
                              }
                              type="number"
                              min="0"
                              inputMode="numeric"
                              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-3 py-3 text-center text-2xl font-black text-white outline-none focus:border-yellow-300/50"
                              placeholder="0"
                            />
                          </label>

                          <div className="pb-3 text-lg font-black text-white/35">
                            -
                          </div>

                          <label className="block text-center">
                            <span className="block truncate text-[11px] font-black text-white/70">
                              {match.away_team}
                            </span>
                            <input
                              value={awayScores[match.id] ?? ""}
                              onChange={(e) =>
                                setAwayScores((prev) => ({
                                  ...prev,
                                  [match.id]: e.target.value,
                                }))
                              }
                              type="number"
                              min="0"
                              inputMode="numeric"
                              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-3 py-3 text-center text-2xl font-black text-white outline-none focus:border-yellow-300/50"
                              placeholder="0"
                            />
                          </label>
                        </div>

                        <button
                          disabled={working || match.status === "finished"}
                          onClick={() => finishMatch(match)}
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-yellow-300/25 bg-yellow-400/12 px-4 py-3 text-sm font-black text-yellow-100 shadow-[0_0_22px_rgba(250,204,21,0.10)] disabled:opacity-35"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {working ? "Procesando..." : "Finalizar y premiar"}
                        </button>

                        {match.status === "finished" ? (
                          <p className="mt-2 text-center text-[11px] font-bold text-yellow-100/55">
                            Este partido ya fue finalizado. No lo premies de nuevo.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
