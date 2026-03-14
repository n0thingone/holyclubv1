"use client";

import { useActiveEvent } from "@/hooks/useActiveEvent";
import { useRanking } from "@/hooks/useRanking";
import { Trophy, Zap, TrendingUp } from "lucide-react";

const RANK_STYLES = [
  {
    bg: "bg-gradient-to-r from-yellow-500/20 to-amber-500/10",
    border: "border-yellow-500/40",
    text: "text-yellow-400",
    badge: "bg-yellow-500 text-black",
    emoji: "🥇",
  },
  {
    bg: "bg-gradient-to-r from-slate-400/15 to-slate-500/10",
    border: "border-slate-400/30",
    text: "text-slate-300",
    badge: "bg-slate-400 text-black",
    emoji: "🥈",
  },
  {
    bg: "bg-gradient-to-r from-amber-700/20 to-amber-800/10",
    border: "border-amber-700/40",
    text: "text-amber-600",
    badge: "bg-amber-700 text-white",
    emoji: "🥉",
  },
];

export default function RankingPage() {
  const { event } = useActiveEvent();
  const { ranking, loading } = useRanking(event?.id);

  return (
    <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-purple shadow-purple mb-3">
          <Trophy className="w-7 h-7 text-black" />
        </div>
        <h1 className="font-display text-3xl font-black tracking-widest text-white glow-text">
          RANKING
        </h1>
        {event && (
          <p className="text-text-muted text-sm mt-1">{event.name}</p>
        )}
        <div className="flex items-center justify-center gap-1.5 mt-2">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-xs text-success uppercase tracking-widest">
            En vivo
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Zap className="w-8 h-8 text-accent-purple animate-pulse" />
        </div>
      ) : !event ? (
        <div className="holy-card text-center py-12">
          <Trophy className="w-12 h-12 mx-auto mb-3 text-text-muted opacity-30" />
          <p className="text-text-muted">No hay evento activo</p>
        </div>
      ) : ranking.length === 0 ? (
        <div className="holy-card text-center py-12">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 text-accent-purple opacity-30" />
          <p className="text-text-muted">Sin ingresos aún</p>
          <p className="text-text-muted text-xs mt-1">
            El ranking se actualiza en tiempo real
          </p>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-in">
          {ranking.map((r, index) => {
            const style = RANK_STYLES[index] || {
              bg: "bg-card",
              border: "border-border",
              text: "text-text-muted",
              badge: "bg-border text-text-muted",
              emoji: null,
            };

            return (
              <div
                key={r.rrpp_id}
                className={`rounded-2xl border p-4 flex items-center gap-4 transition-all animate-slide-up ${style.bg} ${style.border} ${
                  index === 0 ? "rank-1" : ""
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Position */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-display font-black text-lg flex-shrink-0 ${style.badge}`}
                >
                  {style.emoji || `${r.position}`}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-display font-bold text-lg tracking-wide truncate ${
                      index < 3 ? "text-white" : "text-text-primary"
                    }`}
                  >
                    {r.display_name}
                  </p>
                  <p className="text-xs text-text-muted uppercase tracking-widest">
                    #{r.position} en el ranking
                  </p>
                </div>

                {/* Count */}
                <div className="text-right flex-shrink-0">
                  <p
                    className={`font-display text-3xl font-black ${style.text}`}
                  >
                    {r.checkin_count}
                  </p>
                  <p className="text-xs text-text-muted uppercase tracking-widest">
                    ingresos
                  </p>
                </div>
              </div>
            );
          })}

          {/* Progress bars for top 3 */}
          {ranking.length > 0 && (
            <div className="holy-card mt-6">
              <p className="font-display text-xs tracking-widest text-text-muted uppercase mb-4">
                Comparativa top 3
              </p>
              <div className="space-y-3">
                {ranking.slice(0, 3).map((r, i) => {
                  const max = ranking[0]?.checkin_count || 1;
                  const pct = Math.round((r.checkin_count / max) * 100);
                  const colors = [
                    "bg-yellow-400",
                    "bg-slate-300",
                    "bg-amber-700",
                  ];
                  return (
                    <div key={r.rrpp_id}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-text-primary font-semibold">
                          {r.display_name}
                        </span>
                        <span className="text-text-muted">{r.checkin_count}</span>
                      </div>
                      <div className="h-2 bg-background rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${colors[i]}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
