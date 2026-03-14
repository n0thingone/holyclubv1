import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { History, Users, LogIn, Crown, Trophy } from "lucide-react";
import type { EventSnapshot } from "@/types";

export default async function HistoryPage() {
  const supabase = createClient();

  const { data: snapshots } = await supabase
    .from("event_snapshots")
    .select("*")
    .order("closed_at", { ascending: false });

  return (
    <div className="px-4 py-6 space-y-6 animate-fade-in max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <History className="w-6 h-6 text-accent-purple" />
        <div>
          <h1 className="font-display text-2xl font-black tracking-widest text-white">HISTORIAL</h1>
          <p className="text-text-muted text-sm">Noches cerradas</p>
        </div>
      </div>

      {!snapshots?.length ? (
        <div className="holy-card text-center py-12">
          <History className="w-12 h-12 mx-auto mb-3 text-text-muted opacity-30" />
          <p className="text-text-muted text-sm">Aún no hay noches cerradas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(snapshots as EventSnapshot[]).map((snap) => (
            <Link key={snap.id} href={`/dashboard/history/${snap.id}`}>
              <div className="holy-card hover:border-accent-purple/40 transition-colors cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="font-display text-base font-bold text-white tracking-wider">
                      {snap.event_name}
                    </h2>
                    <p className="text-text-muted text-xs mt-0.5">{formatDate(snap.event_date)}</p>
                  </div>
                  <span className="text-xs bg-background px-2 py-1 rounded-lg text-text-muted border border-border">
                    CERRADO
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-background/50 rounded-xl p-2.5 text-center">
                    <Users className="w-3.5 h-3.5 text-accent-purple mx-auto mb-1" />
                    <p className="font-display text-lg font-bold text-white">{snap.total_guests}</p>
                    <p className="text-text-muted text-xs">anotados</p>
                  </div>
                  <div className="bg-background/50 rounded-xl p-2.5 text-center">
                    <LogIn className="w-3.5 h-3.5 text-success mx-auto mb-1" />
                    <p className="font-display text-lg font-bold text-success">{snap.total_checkins}</p>
                    <p className="text-text-muted text-xs">ingresos</p>
                  </div>
                  <div className="bg-background/50 rounded-xl p-2.5 text-center">
                    <Crown className="w-3.5 h-3.5 text-gold mx-auto mb-1" />
                    <p className="font-display text-lg font-bold text-gold">{snap.total_gold}</p>
                    <p className="text-text-muted text-xs">gold</p>
                  </div>
                </div>

                {snap.top3_json?.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Trophy className="w-3.5 h-3.5 text-accent-purple flex-shrink-0" />
                    <p className="text-xs text-text-muted">
                      Top 3: {snap.top3_json.map((r: any) => r.display_name).join(" · ")}
                    </p>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
