import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatDate, formatTime } from "@/lib/utils";
import { ArrowLeft, Users, LogIn, Crown, Trophy, Clock, UserCheck } from "lucide-react";
import type { EventSnapshot } from "@/types";

export default async function HistoryDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: snap } = await supabase
    .from("event_snapshots")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!snap) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto">
        <p className="text-text-muted">Noche no encontrada.</p>
      </div>
    );
  }

  const snapshot = snap as EventSnapshot;

  return (
    <div className="px-4 py-6 space-y-5 animate-fade-in max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/history" className="p-2 rounded-xl bg-card border border-border">
          <ArrowLeft className="w-4 h-4 text-text-muted" />
        </Link>
        <div>
          <h1 className="font-display text-xl font-black tracking-wider text-white">
            {snapshot.event_name}
          </h1>
          <p className="text-text-muted text-xs">{formatDate(snapshot.event_date)}</p>
        </div>
      </div>

      {/* Cierre */}
      <div className="holy-card flex items-center gap-3">
        <Clock className="w-5 h-5 text-text-muted" />
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wider">Cerrado a las</p>
          <p className="font-display text-lg font-bold text-white">
            {new Date(snapshot.closed_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="ml-auto">
          <span className="text-xs bg-background px-2 py-1 rounded-lg text-text-muted border border-border">
            CERRADO
          </span>
        </div>
      </div>

      {/* Métricas finales */}
      <div>
        <h2 className="font-display text-xs tracking-widest text-text-muted uppercase mb-3">
          Métricas finales
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card text-center">
            <Users className="w-4 h-4 text-accent-purple mx-auto mb-1" />
            <p className="font-display text-2xl font-bold text-white">{snapshot.total_guests}</p>
            <p className="text-text-muted text-xs">Anotados</p>
          </div>
          <div className="stat-card text-center">
            <LogIn className="w-4 h-4 text-success mx-auto mb-1" />
            <p className="font-display text-2xl font-bold text-success">{snapshot.total_checkins}</p>
            <p className="text-text-muted text-xs">Ingresos</p>
          </div>
          <div className="stat-card text-center">
            <Crown className="w-4 h-4 text-gold mx-auto mb-1" />
            <p className="font-display text-2xl font-bold text-gold">{snapshot.total_gold}</p>
            <p className="text-text-muted text-xs">Gold</p>
          </div>
        </div>
      </div>

      {/* RRPP activos */}
      <div className="holy-card flex items-center gap-3">
        <UserCheck className="w-5 h-5 text-accent-purple" />
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wider">RRPP activos esa noche</p>
          <p className="font-display text-xl font-bold text-white">{snapshot.total_rrpp_active}</p>
        </div>
      </div>

      {/* Ranking final */}
      {snapshot.ranking_json?.length > 0 && (
        <div>
          <h2 className="font-display text-xs tracking-widest text-text-muted uppercase mb-3 flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-accent-purple" />
            Ranking final
          </h2>
          <div className="space-y-2">
            {snapshot.ranking_json.map((r: any, i: number) => (
              <div
                key={r.rrpp_id}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${
                  i === 0 ? "bg-accent-purple/10 border border-accent-purple/20" :
                  i === 1 ? "bg-background/70 border border-border" :
                  "bg-background/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-display text-sm font-bold text-accent-purple w-6">
                    #{r.position}
                  </span>
                  <span className="text-sm font-semibold text-text-primary">{r.display_name}</span>
                </div>
                <span className="font-display text-sm font-bold text-white">{r.checkin_count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
