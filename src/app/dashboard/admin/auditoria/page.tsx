// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Coins,
  Flag,
  RefreshCcw,
  Search,
  ShieldCheck,
  Users,
  WalletCards,
  Zap,
} from "lucide-react";
import DashboardShell from "@/components/navigation/DashboardShell";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

type ProfileRow = {
  id: string;
  full_name?: string | null;
  username?: string | null;
  email?: string | null;
  role?: string | null;
  holy_points_balance?: number | null;
};

type MovementRow = {
  id: string;
  user_id: string | null;
  amount: number;
  type: string | null;
  description: string | null;
  created_at: string;
};

type RedemptionRow = {
  id: string;
  user_id: string | null;
  status: string | null;
  points_cost: number | null;
  reward_id: string | null;
  created_at: string;
  redeemed_at: string | null;
  expires_at: string | null;
};

type SuspiciousItem = {
  id: string;
  userId: string | null;
  userName: string;
  type: string;
  description: string;
  amount: number;
  created_at: string;
  reason: string;
  severity: "low" | "medium" | "high";
};

type ActiveTab = "resumen" | "alertas" | "movimientos" | "balance";

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString("es-AR");
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getUserName(profile?: ProfileRow | null) {
  if (!profile) return "Usuario desconocido";

  return (
    String(profile.full_name || "").trim() ||
    String(profile.username || "").trim() ||
    String(profile.email || "").split("@")[0] ||
    "Usuario"
  );
}

function getMovementColor(amount: number) {
  if (amount > 0) return "text-emerald-400";
  if (amount < 0) return "text-red-400";
  return "text-white/55";
}

function getSeverityClasses(severity: string) {
  if (severity === "high") {
    return {
      border: "border-red-500/30",
      bg: "bg-red-500/10",
      text: "text-red-300",
    };
  }

  if (severity === "medium") {
    return {
      border: "border-amber-500/30",
      bg: "bg-amber-500/10",
      text: "text-amber-300",
    };
  }

  return {
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/10",
    text: "text-cyan-300",
  };
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: string | number;
  tone: "violet" | "emerald" | "amber" | "red" | "cyan";
}) {
  const tones = {
    violet: "border-violet-400/25 bg-violet-500/10 text-violet-300",
    emerald: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
    amber: "border-amber-400/25 bg-amber-500/10 text-amber-300",
    red: "border-red-400/25 bg-red-500/10 text-red-300",
    cyan: "border-cyan-400/25 bg-cyan-500/10 text-cyan-300",
  };

  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.045] p-4">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${tones[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold text-white/45">{label}</p>
          <p className="mt-0.5 text-2xl font-black leading-none text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminAuditoriaPage() {
  const supabase = getSupabaseClient();
  const { profile } = useAuth();

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("resumen");

  const role = String((profile as any)?.role || "").toLowerCase();
  const isAdmin = role === "admin" || role === "cashier" || role === "cajero";

  const profilesById = useMemo(() => {
    const map: Record<string, ProfileRow> = {};

    profiles.forEach((p) => {
      if (p.id) map[p.id] = p;
    });

    return map;
  }, [profiles]);

  async function loadAuditData() {
    try {
      setLoading(true);

      const [
        { data: profilesData, error: profilesError },
        { data: movsData, error: movsError },
        { data: redsData, error: redsError },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, username, email, role, holy_points_balance")
          .limit(2000),

        supabase
          .from("holy_points_movements")
          .select("id, user_id, amount, type, description, created_at")
          .order("created_at", { ascending: false })
          .limit(3000),

        supabase
          .from("holy_redemptions")
          .select(
            "id, user_id, status, points_cost, reward_id, created_at, redeemed_at, expires_at"
          )
          .order("created_at", { ascending: false })
          .limit(2000),
      ]);

      if (profilesError) {
        console.error("Error cargando profiles:", profilesError);
      }

      if (movsError) {
        console.error("Error cargando movimientos:", movsError);
      }

      if (redsError) {
        console.error("Error cargando redemptions:", redsError);
      }

      setProfiles((profilesData ?? []) as ProfileRow[]);
      setMovements((movsData ?? []) as MovementRow[]);
      setRedemptions((redsData ?? []) as RedemptionRow[]);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error general en auditoría:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    void loadAuditData();

    const interval = setInterval(() => {
      void loadAuditData();
    }, 12000);

    return () => clearInterval(interval);
  }, [isAdmin]);

  const audit = useMemo(() => {
    const totalUsers = profiles.length;

    const totalStoredCredits = profiles.reduce(
      (acc, p) => acc + Number(p.holy_points_balance ?? 0),
      0
    );

    const totalMovementCredits = movements.reduce(
      (acc, m) => acc + Number(m.amount ?? 0),
      0
    );

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const last24h = now - dayMs;
    const last7d = now - dayMs * 7;

    const movements24h = movements.filter(
      (m) => new Date(m.created_at).getTime() >= last24h
    );

    const movements7d = movements.filter(
      (m) => new Date(m.created_at).getTime() >= last7d
    );

    const credits24h = movements24h.reduce(
      (acc, m) => acc + Number(m.amount ?? 0),
      0
    );

    const byUserSum: Record<string, number> = {};
    const byUserMovements: Record<string, MovementRow[]> = {};
    const byType: Record<
      string,
      { label: string; count: number; total: number }
    > = {};

    movements.forEach((m) => {
      const uid = String(m.user_id || "unknown");
      const amount = Number(m.amount ?? 0);
      const type = String(m.type || "otros");

      byUserSum[uid] = (byUserSum[uid] || 0) + amount;

      if (!byUserMovements[uid]) byUserMovements[uid] = [];
      byUserMovements[uid].push(m);

      if (!byType[type]) {
        byType[type] = {
          label: type,
          count: 0,
          total: 0,
        };
      }

      byType[type].count += 1;
      byType[type].total += amount;
    });

    const profileIdsFromMovements = Object.keys(byUserSum).filter(
      (id) => id !== "unknown"
    );

    const profileLikeRows = profiles.map((p) => {
      const calculated = Number(byUserSum[p.id] ?? 0);
      const stored = Number(p.holy_points_balance ?? 0);
      const diff = stored - calculated;

      return {
        profile: p,
        calculated,
        stored,
        diff,
        absDiff: Math.abs(diff),
      };
    });

    const movementOnlyRows = profileIdsFromMovements
      .filter((id) => !profilesById[id])
      .map((id) => {
        const calculated = Number(byUserSum[id] ?? 0);
        const fakeProfile: ProfileRow = {
          id,
          full_name: "Usuario desconocido",
          username: null,
          email: null,
          role: null,
          holy_points_balance: 0,
        };

        return {
          profile: fakeProfile,
          calculated,
          stored: 0,
          diff: 0 - calculated,
          absDiff: Math.abs(0 - calculated),
        };
      });

    const balanceRows = [...profileLikeRows, ...movementOnlyRows].sort(
      (a, b) => b.absDiff - a.absDiff
    );

    const inconsistent = balanceRows.filter((row) => row.absDiff !== 0);
    const consistent = Math.max(0, balanceRows.length - inconsistent.length);

    const consistency =
      balanceRows.length > 0
        ? Math.max(0, (consistent / balanceRows.length) * 100)
        : 100;

    const suspicious: SuspiciousItem[] = [];

    movements.forEach((m) => {
      const amount = Number(m.amount ?? 0);
      const type = String(m.type || "").toLowerCase();
      const description = String(m.description || "");
      const profile = m.user_id ? profilesById[m.user_id] : null;
      const userName = getUserName(profile);

      if (amount >= 25000) {
        suspicious.push({
          id: `high-positive-${m.id}`,
          userId: m.user_id,
          userName,
          type: m.type || "Movimiento",
          description: description || "Movimiento positivo de créditos",
          amount,
          created_at: m.created_at,
          reason: "Monto positivo inusualmente alto",
          severity: amount >= 50000 ? "high" : "medium",
        });
      }

      if (amount <= -25000) {
        suspicious.push({
          id: `high-negative-${m.id}`,
          userId: m.user_id,
          userName,
          type: m.type || "Movimiento",
          description: description || "Movimiento negativo de créditos",
          amount,
          created_at: m.created_at,
          reason: "Descuento/retiro de créditos alto",
          severity: "medium",
        });
      }

      if (type.includes("admin") && Math.abs(amount) >= 10000) {
        suspicious.push({
          id: `admin-adjust-${m.id}`,
          userId: m.user_id,
          userName,
          type: m.type || "Ajuste Admin",
          description: description || "Ajuste manual de créditos",
          amount,
          created_at: m.created_at,
          reason: "Ajuste manual importante",
          severity: Math.abs(amount) >= 50000 ? "high" : "medium",
        });
      }

      if (type.includes("mystery") && amount >= 10000) {
        suspicious.push({
          id: `mystery-high-${m.id}`,
          userId: m.user_id,
          userName,
          type: m.type || "Mystery Box",
          description: description || "Premio Mystery Box",
          amount,
          created_at: m.created_at,
          reason: "Premio alto de Mystery Box",
          severity: "medium",
        });
      }
    });

    Object.entries(byUserMovements).forEach(([userId, userMovs]) => {
      const recentAdmin = userMovs.filter((m) => {
        const type = String(m.type || "").toLowerCase();
        const t = new Date(m.created_at).getTime();

        return type.includes("admin") && t >= last24h;
      });

      if (recentAdmin.length >= 3) {
        const profile = profilesById[userId];

        suspicious.push({
          id: `many-admin-${userId}`,
          userId,
          userName: getUserName(profile),
          type: "Ajustes Admin",
          description: `${recentAdmin.length} ajustes manuales en 24h`,
          amount: recentAdmin.reduce(
            (acc, m) => acc + Number(m.amount ?? 0),
            0
          ),
          created_at: recentAdmin[0]?.created_at || new Date().toISOString(),
          reason: "Múltiples ajustes manuales",
          severity: "high",
        });
      }

      const recentMysteryHigh = userMovs.filter((m) => {
        const type = String(m.type || "").toLowerCase();
        const t = new Date(m.created_at).getTime();

        return (
          type.includes("mystery") &&
          Number(m.amount ?? 0) >= 10000 &&
          t >= last24h
        );
      });

      if (recentMysteryHigh.length >= 2) {
        const profile = profilesById[userId];

        suspicious.push({
          id: `many-mystery-${userId}`,
          userId,
          userName: getUserName(profile),
          type: "Mystery Box",
          description: `${recentMysteryHigh.length} premios altos en 24h`,
          amount: recentMysteryHigh.reduce(
            (acc, m) => acc + Number(m.amount ?? 0),
            0
          ),
          created_at:
            recentMysteryHigh[0]?.created_at || new Date().toISOString(),
          reason: "Patrón raro de premios",
          severity: "high",
        });
      }
    });

    const topCreditUsers = profiles
      .map((p) => ({
        profile: p,
        credits: Number(p.holy_points_balance ?? 0),
        lastMovement: byUserMovements[p.id]?.[0]?.created_at || null,
      }))
      .sort((a, b) => b.credits - a.credits)
      .slice(0, 8);

    const recentSuspicious = suspicious
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      )
      .slice(0, 12);

    const movementTypes = Object.values(byType)
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
      .slice(0, 7);

    const totalTypeCount = movementTypes.reduce(
      (acc, item) => acc + item.count,
      0
    );

    const activeAlerts = [
      inconsistent.length > 0
        ? {
            id: "balance",
            title: "Diferencia de balance detectada",
            description: `${inconsistent.length} balances para revisar`,
            severity: "high" as const,
          }
        : null,

      suspicious.filter(
        (s) => s.reason.includes("Mystery") || s.reason.includes("premios")
      ).length > 0
        ? {
            id: "mystery",
            title: "Patrón de premios altos",
            description: "Hay premios grandes o repetidos en Mystery Box",
            severity: "medium" as const,
          }
        : null,

      suspicious.filter(
        (s) => s.reason.includes("manual") || s.reason.includes("Admin")
      ).length > 0
        ? {
            id: "admin",
            title: "Ajustes manuales para revisar",
            description: "Hay movimientos admin con montos importantes",
            severity: "medium" as const,
          }
        : null,
    ].filter(Boolean);

    return {
      totalUsers,
      totalStoredCredits,
      totalMovementCredits,
      movements24h,
      movements7d,
      credits24h,
      consistency,
      consistent,
      inconsistent,
      topCreditUsers,
      recentSuspicious,
      movementTypes,
      totalTypeCount,
      activeAlerts,
      balanceRows,
      redemptionsCount: redemptions.length,
    };
  }, [profiles, movements, redemptions, profilesById]);

  const filteredBalanceRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return audit.balanceRows
      .filter((row) => {
        if (!q) return row.absDiff > 0;

        const name = getUserName(row.profile).toLowerCase();
        const email = String(row.profile.email || "").toLowerCase();
        const id = String(row.profile.id || "").toLowerCase();

        return name.includes(q) || email.includes(q) || id.includes(q);
      })
      .slice(0, 20);
  }, [audit.balanceRows, search]);

  const StatCards = () => (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        icon={Users}
        label="Usuarios Totales"
        value={formatNumber(audit.totalUsers)}
        tone="violet"
      />

      <StatCard
        icon={Coins}
        label="Créditos Guardados"
        value={formatNumber(audit.totalStoredCredits)}
        tone="emerald"
      />

      <StatCard
        icon={Activity}
        label="Movimientos 7d"
        value={formatNumber(audit.movements7d.length)}
        tone="amber"
      />

      <StatCard
        icon={AlertTriangle}
        label="Alertas Activas"
        value={formatNumber(audit.activeAlerts.length)}
        tone="red"
      />

      <StatCard
        icon={Flag}
        label="Balances a revisar"
        value={formatNumber(audit.inconsistent.length)}
        tone="cyan"
      />
    </div>
  );

  const TopCreditUsersCard = () => (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-4">
      <h2 className="text-base font-black text-white">
        Usuarios con más créditos
      </h2>

      <div className="mt-4 space-y-2">
        {audit.topCreditUsers.map((row, index) => (
          <div
            key={row.profile.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/20 px-3 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/15 text-xs font-black text-fuchsia-200">
                {index + 1}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">
                  {getUserName(row.profile)}
                </p>

                <p className="text-[11px] text-white/35">
                  Último mov: {formatDate(row.lastMovement)}
                </p>
              </div>
            </div>

            <p className="shrink-0 text-sm font-black text-fuchsia-300">
              {formatNumber(row.credits)}
            </p>
          </div>
        ))}

        {!loading && audit.topCreditUsers.length === 0 && (
          <p className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-sm text-white/40">
            No hay usuarios cargados. Si ves movimientos pero no usuarios, falta
            policy RLS para leer profiles.
          </p>
        )}
      </div>
    </div>
  );

  const MovementTypesCard = () => (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-4">
      <h2 className="text-base font-black text-white">Movimientos por tipo</h2>

      <div className="mt-4 space-y-3">
        {audit.movementTypes.map((item) => {
          const percent =
            audit.totalTypeCount > 0
              ? Math.round((item.count / audit.totalTypeCount) * 100)
              : 0;

          return (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-bold text-white/75">
                  {item.label || "otros"}
                </span>

                <span className="text-white/40">
                  {percent}% · {item.count}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-fuchsia-400"
                  style={{ width: `${Math.max(percent, 4)}%` }}
                />
              </div>
            </div>
          );
        })}

        {!loading && audit.movementTypes.length === 0 && (
          <p className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-sm text-white/40">
            No hay movimientos.
          </p>
        )}
      </div>
    </div>
  );

  const BalanceSummaryCard = () => (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-4">
      <h2 className="text-base font-black text-white">
        Control de balance histórico
      </h2>

      <p className="mt-1 text-xs text-white/45 md:hidden">
        Puede marcar diferencias si hubo cargas antiguas o ajustes previos sin
        historial.
      </p>

      <div className="mt-4 flex items-center gap-5">
        <div
          className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(rgb(217 70 239) ${audit.consistency}%, rgba(255,255,255,0.08) 0)`,
          }}
        >
          <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-[#08080c]">
            <p className="text-2xl font-black text-white">
              {audit.consistency.toFixed(1)}%
            </p>

            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
              OK
            </p>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-xs text-white/50">Consistentes</span>
            <span className="font-black text-emerald-400">
              {formatNumber(audit.consistent)}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-xs text-white/50">A revisar</span>
            <span className="font-black text-red-400">
              {formatNumber(audit.inconsistent.length)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Dif total</span>
            <span className="font-black text-amber-300">
              {formatNumber(
                audit.inconsistent.reduce((acc, row) => acc + row.absDiff, 0)
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const SuspiciousMovementsCard = () => (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-black text-white">
          Movimientos sospechosos
        </h2>

        <span className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-red-300">
          {audit.recentSuspicious.length} detectados
        </span>
      </div>

      <div className="mt-4 hidden overflow-x-auto md:block">
        {audit.recentSuspicious.length > 0 ? (
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-white/40">
                <th className="px-3 py-3 font-bold">Usuario</th>
                <th className="px-3 py-3 font-bold">Tipo</th>
                <th className="px-3 py-3 font-bold">Descripción</th>
                <th className="px-3 py-3 font-bold">Cantidad</th>
                <th className="px-3 py-3 font-bold">Fecha</th>
                <th className="px-3 py-3 font-bold">Motivo</th>
              </tr>
            </thead>

            <tbody>
              {audit.recentSuspicious.map((item) => {
                const sev = getSeverityClasses(item.severity);

                return (
                  <tr key={item.id} className="border-b border-white/6">
                    <td className="px-3 py-3 font-bold text-white">
                      {item.userName}
                    </td>

                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase ${sev.border} ${sev.bg} ${sev.text}`}
                      >
                        {item.type}
                      </span>
                    </td>

                    <td className="max-w-[260px] px-3 py-3 text-white/65">
                      {item.description}
                    </td>

                    <td
                      className={`px-3 py-3 font-black ${getMovementColor(
                        item.amount
                      )}`}
                    >
                      {item.amount > 0 ? "+" : ""}
                      {formatNumber(item.amount)}
                    </td>

                    <td className="px-3 py-3 text-white/45">
                      {formatDate(item.created_at)}
                    </td>

                    <td className="px-3 py-3 text-white/65">
                      {item.reason}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="rounded-2xl border border-dashed border-emerald-500/20 bg-emerald-500/5 p-5 text-center text-sm text-emerald-300">
            Todo limpio por ahora. No se detectaron movimientos sospechosos.
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3 md:hidden">
        {audit.recentSuspicious.length > 0 ? (
          audit.recentSuspicious.map((item) => {
            const sev = getSeverityClasses(item.severity);

            return (
              <div
                key={item.id}
                className={`rounded-[22px] border ${sev.border} bg-black/25 p-4`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white">
                      {item.userName}
                    </p>

                    <p className="mt-1 text-xs text-white/45">
                      {formatDate(item.created_at)}
                    </p>
                  </div>

                  <p
                    className={`shrink-0 text-sm font-black ${getMovementColor(
                      item.amount
                    )}`}
                  >
                    {item.amount > 0 ? "+" : ""}
                    {formatNumber(item.amount)}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase ${sev.border} ${sev.bg} ${sev.text}`}
                  >
                    {item.type}
                  </span>

                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-white/55">
                    {item.reason}
                  </span>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-white/65">
                  {item.description}
                </p>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-emerald-500/20 bg-emerald-500/5 p-5 text-center text-sm text-emerald-300">
            Todo limpio por ahora. No se detectaron movimientos sospechosos.
          </div>
        )}
      </div>
    </div>
  );

  const LiveActivityCard = () => (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-4">
      <h2 className="text-base font-black text-white">Actividad en tiempo real</h2>

      <div className="mt-4 space-y-2">
        {movements.slice(0, 12).map((m) => {
          const userName = getUserName(
            m.user_id ? profilesById[m.user_id] : null
          );
          const positive = Number(m.amount ?? 0) > 0;

          return (
            <div
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/20 px-3 py-3"
            >
              <div className="flex min-w-0 items-center gap-2">
                {positive ? (
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <ArrowDownLeft className="h-4 w-4 shrink-0 text-red-400" />
                )}

                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-white">
                    {userName}
                  </p>

                  <p className="truncate text-[10px] text-white/35">
                    {m.type || "movimiento"}
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <p className={`text-xs font-black ${getMovementColor(m.amount)}`}>
                  {m.amount > 0 ? "+" : ""}
                  {formatNumber(m.amount)}
                </p>

                <p className="text-[10px] text-white/35">
                  {formatDate(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}

        {!loading && movements.length === 0 && (
          <p className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-sm text-white/40">
            Sin actividad reciente.
          </p>
        )}
      </div>
    </div>
  );

  const AlertsSystemCard = () => (
    <div className="rounded-[28px] border border-red-500/25 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.16),transparent_34%),rgba(239,68,68,0.055)] p-4">
      <div className="flex items-center gap-2 text-red-300">
        <AlertTriangle className="h-5 w-5" />
        <h2 className="font-black">Sistema de Alertas</h2>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {audit.activeAlerts.map((alert) => {
          const sev = getSeverityClasses(alert.severity);

          return (
            <div
              key={alert.id}
              className={`rounded-2xl border ${sev.border} ${sev.bg} p-4`}
            >
              <div className={`flex items-center gap-2 ${sev.text}`}>
                <AlertTriangle className="h-4 w-4" />
                <h3 className="text-sm font-black">{alert.title}</h3>
              </div>

              <p className="mt-2 text-xs text-white/60">{alert.description}</p>
            </div>
          );
        })}

        {audit.activeAlerts.length === 0 && (
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 lg:col-span-3">
            <div className="flex items-center gap-2 text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              <h3 className="text-sm font-black">Sistema estable</h3>
            </div>

            <p className="mt-2 text-xs text-white/60">
              No hay alertas activas para revisar.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const BalanceTableCard = () => (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-black text-white">
            Inconsistencias de balance
          </h2>

          <p className="mt-1 text-xs text-white/45">
            Compara el balance actual contra los movimientos registrados. Puede
            marcar diferencias si hubo cargas antiguas o ajustes previos sin
            historial.
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar usuario..."
            className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-10 pr-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-fuchsia-400/35"
          />
        </div>
      </div>

      <div className="mt-4 hidden overflow-x-auto md:block">
        {filteredBalanceRows.length > 0 ? (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-white/40">
                <th className="px-3 py-3 font-bold">Usuario</th>
                <th className="px-3 py-3 font-bold">Guardado</th>
                <th className="px-3 py-3 font-bold">Calculado</th>
                <th className="px-3 py-3 font-bold">Diferencia</th>
                <th className="px-3 py-3 font-bold">Estado</th>
              </tr>
            </thead>

            <tbody>
              {filteredBalanceRows.map((row) => (
                <tr key={row.profile.id} className="border-b border-white/6">
                  <td className="px-3 py-3">
                    <p className="font-bold text-white">
                      {getUserName(row.profile)}
                    </p>

                    <p className="text-[11px] text-white/35">
                      {row.profile.email || row.profile.id}
                    </p>
                  </td>

                  <td className="px-3 py-3 font-black text-fuchsia-300">
                    {formatNumber(row.stored)}
                  </td>

                  <td className="px-3 py-3 font-black text-cyan-300">
                    {formatNumber(row.calculated)}
                  </td>

                  <td
                    className={`px-3 py-3 font-black ${
                      row.diff === 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {row.diff > 0 ? "+" : ""}
                    {formatNumber(row.diff)}
                  </td>

                  <td className="px-3 py-3">
                    {row.diff === 0 ? (
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase text-emerald-300">
                        OK
                      </span>
                    ) : (
                      <span className="rounded-full border border-red-400/20 bg-red-500/10 px-2 py-1 text-[10px] font-black uppercase text-red-300">
                        Revisar
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center text-sm text-white/40">
            No hay inconsistencias para mostrar.
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3 md:hidden">
        {filteredBalanceRows.length > 0 ? (
          filteredBalanceRows.map((row) => (
            <div
              key={row.profile.id}
              className="rounded-[22px] border border-white/10 bg-black/25 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">
                    {getUserName(row.profile)}
                  </p>

                  <p className="mt-1 truncate text-[11px] text-white/35">
                    {row.profile.email || row.profile.id}
                  </p>
                </div>

                {row.diff === 0 ? (
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase text-emerald-300">
                    OK
                  </span>
                ) : (
                  <span className="rounded-full border border-red-400/20 bg-red-500/10 px-2 py-1 text-[10px] font-black uppercase text-red-300">
                    Revisar
                  </span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
                  <p className="text-[10px] text-white/35">Guardado</p>
                  <p className="mt-1 text-xs font-black text-fuchsia-300">
                    {formatNumber(row.stored)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
                  <p className="text-[10px] text-white/35">Calculado</p>
                  <p className="mt-1 text-xs font-black text-cyan-300">
                    {formatNumber(row.calculated)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
                  <p className="text-[10px] text-white/35">Diferencia</p>
                  <p
                    className={`mt-1 text-xs font-black ${
                      row.diff === 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {row.diff > 0 ? "+" : ""}
                    {formatNumber(row.diff)}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center text-sm text-white/40">
            No hay inconsistencias para mostrar.
          </div>
        )}
      </div>
    </div>
  );

  if (!isAdmin) {
    return (
      <DashboardShell title="AUDITORÍA">
        <div className="mx-auto max-w-3xl px-4 pb-24">
          <div className="rounded-[28px] border border-red-500/25 bg-red-500/10 p-6 text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-red-300" />

            <h1 className="mt-4 text-2xl font-black text-white">
              Acceso restringido
            </h1>

            <p className="mt-2 text-sm text-white/60">
              Este sector es solo para administradores.
            </p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="AUDITORÍA">
      <div className="mx-auto max-w-7xl space-y-5 px-4 pb-28 -mt-2">
        <div className="rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.022))] p-5 backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                Panel de admin
              </div>

              <h1 className="mt-3 text-2xl font-black text-white sm:text-4xl">
                Auditoría & Anti-Trampa
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-white/60">
                Monitorea créditos, movimientos raros, diferencias de balance y
                actividad sospechosa.
              </p>

              {lastUpdate && (
                <p className="mt-2 text-xs text-white/35">
                  Última actualización: {formatDate(lastUpdate.toISOString())}
                </p>
              )}
            </div>

            <button
              onClick={() => loadAuditData()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/12 px-4 py-3 text-sm font-black text-fuchsia-100 transition hover:bg-fuchsia-500/20 disabled:opacity-50"
            >
              <RefreshCcw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Actualizar
            </button>
          </div>
        </div>

        <div className="sticky top-[74px] z-30 -mx-4 border-y border-white/10 bg-[#050507]/92 px-4 py-3 backdrop-blur-xl md:hidden">
          <div className="grid grid-cols-4 gap-2">
            {[
              {
                key: "resumen",
                label: "Resumen",
                icon: BarChart3,
              },
              {
                key: "alertas",
                label: "Alertas",
                icon: AlertTriangle,
              },
              {
                key: "movimientos",
                label: "Movim.",
                icon: Activity,
              },
              {
                key: "balance",
                label: "Balance",
                icon: WalletCards,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as ActiveTab)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2 text-[10px] font-black uppercase transition ${
                    active
                      ? "border-fuchsia-400/30 bg-fuchsia-500/18 text-fuchsia-100 shadow-[0_0_22px_rgba(217,70,239,0.18)]"
                      : "border-white/10 bg-white/5 text-white/45"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4 md:hidden">
          {activeTab === "resumen" && (
            <>
              <StatCards />
              <TopCreditUsersCard />
              <MovementTypesCard />
            </>
          )}

          {activeTab === "alertas" && (
            <>
              <AlertsSystemCard />
              <SuspiciousMovementsCard />
            </>
          )}

          {activeTab === "movimientos" && (
            <>
              <LiveActivityCard />
            </>
          )}

          {activeTab === "balance" && (
            <>
              <BalanceSummaryCard />
              <BalanceTableCard />
            </>
          )}
        </div>

        <div className="hidden space-y-5 md:block">
          <StatCards />

          <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr_1fr]">
            <TopCreditUsersCard />
            <MovementTypesCard />
            <BalanceSummaryCard />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.55fr_0.85fr]">
            <SuspiciousMovementsCard />
            <LiveActivityCard />
          </div>

          <AlertsSystemCard />

          <BalanceTableCard />
        </div>
      </div>
    </DashboardShell>
  );
}