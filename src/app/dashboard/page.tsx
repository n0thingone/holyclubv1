"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useActiveEvent } from "@/hooks/useActiveEvent";
import { useRanking } from "@/hooks/useRanking";
import {
  Users,
  LogIn,
  Crown,
  Clock,
  X,
  QrCode,
  Star,
  History,
  CheckCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatTime, formatDate, generateQrToken } from "@/lib/utils";
import type { Profile } from "@/types";

export default function AdminDashboard() {
  const { event, loading: eventLoading, refetch } = useActiveEvent();
  const { ranking } = useRanking(event?.id);
  const [stats, setStats] = useState({
    registered: 0,
    checkedIn: 0,
    gold: 0,
  });
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showGoldQr, setShowGoldQr] = useState(false);
  const [showPromoQr, setShowPromoQr] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [closingEvent, setClosingEvent] = useState(false);
  const [closedSuccess, setClosedSuccess] = useState(false);
  const { profile } = useAuth();
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    if (event) fetchStats();
  }, [event]);

  async function fetchStats() {
    if (!event) return;

    const [reg, checkins] = await Promise.all([
      supabase
        .from("guest_registrations")
        .select("id", { count: "exact" })
        .eq("event_id", event.id),
      supabase
        .from("checkins")
        .select("id, result", { count: "exact" })
        .eq("event_id", event.id),
    ]);

    const goldCount =
      checkins.data?.filter((c) => c.result === "gold_entry").length || 0;
    const validCount =
      checkins.data?.filter((c) => c.result === "valid_entry").length || 0;

    setStats({
      registered: reg.count || 0,
      checkedIn: validCount,
      gold: goldCount,
    });
  }

  async function closeRegistrations() {
    if (!event) return;

    await supabase
      .from("events")
      .update({ registration_until: new Date().toISOString() })
      .eq("id", event.id);

    refetch();
  }

  async function closeEventWithSnapshot() {
    if (!event) return;

    setClosingEvent(true);
    const closedAt = new Date().toISOString();

    try {
      const [regRes, checkinRes, rrppRes, rankingRes] = await Promise.all([
        supabase
          .from("guest_registrations")
          .select("id", { count: "exact" })
          .eq("event_id", event.id),
        supabase
          .from("checkins")
          .select("id, result")
          .eq("event_id", event.id),
        supabase.from("rrpp_profiles").select("id").eq("active", true),
        supabase
          .from("rrpp_ranking")
          .select("*")
          .eq("event_id", event.id)
          .order("position", { ascending: true }),
      ]);

      const totalGuests = regRes.count || 0;
      const totalCheckins =
        checkinRes.data?.filter((c) => c.result === "valid_entry").length || 0;
      const totalGold =
        checkinRes.data?.filter((c) => c.result === "gold_entry").length || 0;
      const totalRrpp = rrppRes.data?.length || 0;
      const rankingData = rankingRes.data || [];
      const top3 = rankingData.slice(0, 3);

      await supabase.from("event_snapshots").upsert({
        event_id: event.id,
        event_name: event.name,
        event_date: event.event_date,
        closed_at: closedAt,
        total_guests: totalGuests,
        total_checkins: totalCheckins,
        total_gold: totalGold,
        total_rrpp_active: totalRrpp,
        ranking_json: rankingData,
        top3_json: top3,
        summary_json: {
          stats: {
            registered: totalGuests,
            checkins: totalCheckins,
            gold: totalGold,
          },
        },
      });

      await supabase
        .from("events")
        .update({ status: "closed", closed_at: closedAt })
        .eq("id", event.id);

      setClosingEvent(false);
      setClosedSuccess(true);
      setShowCloseConfirm(false);

      setTimeout(() => {
        setClosedSuccess(false);
        refetch();
      }, 2000);
    } catch (err) {
      console.error("Error cerrando evento:", err);
      setClosingEvent(false);
    }
  }

  if (eventLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-2 border-accent-purple/30 border-t-accent-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6 animate-fade-in max-w-lg mx-auto">
      <div>
        <h1 className="font-display text-2xl font-black tracking-widest text-white">
          DASHBOARD
        </h1>
        <p className="text-text-muted text-sm mt-1">Panel de administración</p>
      </div>

      {event ? (
        <div className="holy-card border-accent-purple/30 bg-gradient-card">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs text-success uppercase tracking-widest font-semibold">
                  Evento activo
                </span>
              </div>
              <h2 className="font-display text-lg font-bold text-white">
                {event.name}
              </h2>
              <p className="text-text-muted text-sm">
                {formatDate(event.event_date)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-background/50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-accent-purple" />
                <span className="text-xs text-text-muted uppercase tracking-wider">
                  Registro hasta
                </span>
              </div>
              <p className="font-display text-xl font-bold text-white">
                {formatTime(event.registration_until)}
              </p>
            </div>

            <div className="bg-background/50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <QrCode className="w-3.5 h-3.5 text-accent-pink" />
                <span className="text-xs text-text-muted uppercase tracking-wider">
                  QR hasta
                </span>
              </div>
              <p className="font-display text-xl font-bold text-white">
                {formatTime(event.qr_entry_until)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="holy-card text-center py-8">
          <div className="text-text-muted mb-4">
            <QrCode className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay evento activo</p>
          </div>
          <button
            onClick={() => setShowCreateEvent(true)}
            className="holy-btn-primary"
          >
            + CREAR EVENTO
          </button>
        </div>
      )}

      {event && (
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="w-4 h-4 text-accent-purple" />
              <span className="stat-label">Anotados</span>
            </div>
            <span className="stat-value">{stats.registered}</span>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-1.5 mb-1">
              <LogIn className="w-4 h-4 text-success" />
              <span className="stat-label">Ingresos</span>
            </div>
            <span className="stat-value text-success">{stats.checkedIn}</span>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-1.5 mb-1">
              <Crown className="w-4 h-4 text-gold" />
              <span className="stat-label">Gold</span>
            </div>
            <span className="stat-value text-gold">{stats.gold}</span>
          </div>
        </div>
      )}

      {event && ranking.length > 0 && (
        <div className="holy-card">
          <h3 className="font-display text-xs font-bold tracking-widest text-text-muted uppercase mb-3 flex items-center gap-2">
            <Star className="w-3.5 h-3.5 text-accent-purple" />
            Ranking Noche
          </h3>

          <div className="space-y-2">
            {ranking.slice(0, 5).map((r, i) => (
              <div
                key={r.rrpp_id}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${
                  i === 0
                    ? "bg-accent-purple/10 border border-accent-purple/20"
                    : "bg-background/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-display text-sm font-bold text-accent-purple w-6">
                    #{r.position}
                  </span>
                  <span className="text-sm font-semibold text-text-primary">
                    {r.display_name}
                  </span>
                </div>

                <span className="font-display text-sm font-bold text-white">
                  {r.checkin_count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {event && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowGoldQr(true)}
              className="holy-btn-secondary text-gold border-gold/30 hover:border-gold"
            >
              ✦ QR GOLD
            </button>

            <button
              onClick={() => setShowPromoQr(true)}
              className="holy-btn-secondary"
            >
              📢 QR PROMO
            </button>
          </div>

          <button
            onClick={closeRegistrations}
            className="holy-btn-secondary"
          >
            🔒 CERRAR REGISTROS
          </button>

          <button
            onClick={() => router.push("/dashboard/history")}
            className="holy-btn-secondary flex items-center justify-center gap-2"
          >
            <History className="w-4 h-4" />
            HISTORIAL DE NOCHES
          </button>

          <button
            onClick={() => setShowCloseConfirm(true)}
            className="holy-btn-danger"
          >
            ✕ CERRAR EVENTO
          </button>
        </div>
      )}

      {!event && (
        <button
          onClick={() => setShowCreateEvent(true)}
          className="holy-btn-primary"
        >
          + CREAR EVENTO
        </button>
      )}

      {showCreateEvent && (
        <CreateEventModal
          profile={profile}
          onClose={() => setShowCreateEvent(false)}
          onCreated={() => {
            setShowCreateEvent(false);
            refetch();
          }}
        />
      )}

      {showGoldQr && event && (
        <CreateGoldQrModal
          eventId={event.id}
          profileId={profile?.id || ""}
          onClose={() => setShowGoldQr(false)}
        />
      )}

      {showCloseConfirm && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-end">
          <div className="w-full max-w-lg mx-auto bg-card border border-border rounded-t-3xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold tracking-widest text-danger">
                ✕ CERRAR EVENTO
              </h2>
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="p-2 rounded-lg bg-background text-text-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-text-muted text-sm mb-6">
              ¿Seguro que querés cerrar este evento? Se guardará el resumen final
              de la noche y dejará de figurar como evento activo.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="holy-btn-secondary flex-1"
              >
                Cancelar
              </button>

              <button
                onClick={closeEventWithSnapshot}
                disabled={closingEvent}
                className="holy-btn-danger flex-1"
              >
                {closingEvent ? "Cerrando..." : "Confirmar cierre"}
              </button>
            </div>
          </div>
        </div>
      )}

      {closedSuccess && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-success/20 border border-success/40 rounded-2xl px-6 py-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-success" />
          <span className="text-success text-sm font-semibold">
            Evento cerrado correctamente
          </span>
        </div>
      )}

      {showPromoQr && (
        <CreatePromoQrModal
          profileId={profile?.id || ""}
          onClose={() => setShowPromoQr(false)}
        />
      )}
    </div>
  );
}

function CreateEventModal({
  profile,
  onClose,
  onCreated,
}: {
  profile: Profile | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const supabase = createClient();
  const [form, setForm] = useState({
    name: "",
    event_date: new Date().toISOString().split("T")[0],
    registration_until_time: "01:30",
    qr_entry_until_time: "02:30",
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);

    const dateBase = form.event_date;
    const regUntil = new Date(
      `${dateBase}T${form.registration_until_time}:00-03:00`
    );
    const qrUntil = new Date(
      `${dateBase}T${form.qr_entry_until_time}:00-03:00`
    );

    if (form.registration_until_time < "12:00") {
      regUntil.setDate(regUntil.getDate() + 1);
    }
    if (form.qr_entry_until_time < "12:00") {
      qrUntil.setDate(qrUntil.getDate() + 1);
    }

    await supabase.from("events").insert({
      name: form.name,
      event_date: form.event_date,
      status: "active",
      registration_until: regUntil.toISOString(),
      qr_entry_until: qrUntil.toISOString(),
      created_by: profile.id,
    });

    const { data: rrpps } = await supabase
      .from("rrpp_profiles")
      .select("id")
      .eq("active", true);

    if (rrpps) {
      const { data: eventData } = await supabase
        .from("events")
        .select("id")
        .eq("status", "active")
        .single();

      if (eventData) {
        const benefits = rrpps.map((r) => ({
          event_id: eventData.id,
          rrpp_id: r.id,
          benefit_type: "vaso_litro",
          title: "VASO LITRO",
          status: "issued",
          issued_at: new Date().toISOString(),
        }));

        await supabase.from("rrpp_event_benefits").insert(benefits);

        const rewards = rrpps.map((r) => ({
          event_id: eventData.id,
          rrpp_id: r.id,
          reward_type: "bottle",
          title: "Botella de Champagne",
          trigger_count: 35,
          status: "locked",
        }));

        await supabase.from("rrpp_event_rewards").insert(rewards);
      }
    }

    setLoading(false);
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-end">
      <div className="w-full max-w-lg mx-auto bg-card border border-border rounded-t-3xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-lg font-bold tracking-widest">
            NUEVO EVENTO
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-background text-text-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="holy-label">Nombre del Evento</label>
            <input
              className="holy-input"
              placeholder="Viernes Eléctrico"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="holy-label">Fecha</label>
            <input
              type="date"
              className="holy-input"
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="holy-label">Registro hasta</label>
              <input
                type="time"
                className="holy-input"
                value={form.registration_until_time}
                onChange={(e) =>
                  setForm({
                    ...form,
                    registration_until_time: e.target.value,
                  })
                }
                required
              />
            </div>

            <div>
              <label className="holy-label">QR hasta</label>
              <input
                type="time"
                className="holy-input"
                value={form.qr_entry_until_time}
                onChange={(e) =>
                  setForm({
                    ...form,
                    qr_entry_until_time: e.target.value,
                  })
                }
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="holy-btn-primary">
            {loading ? "Creando..." : "CREAR EVENTO"}
          </button>
        </form>
      </div>
    </div>
  );
}

function CreateGoldQrModal({
  eventId,
  profileId,
  onClose,
}: {
  eventId: string;
  profileId: string;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [title, setTitle] = useState("GOLD ENTRY");
  const [maxUses, setMaxUses] = useState(10);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  async function handleCreate() {
    setLoading(true);

    const token = generateQrToken();

    await supabase.from("gold_qrs").insert({
      event_id: eventId,
      title,
      qr_token: token,
      max_uses: maxUses,
      created_by: profileId,
      valid_until: null,
    });

    setCreated(token);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-end">
      <div className="w-full max-w-lg mx-auto bg-card border border-border rounded-t-3xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-lg font-bold tracking-widest text-gold">
            ✦ QR GOLD
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-background text-text-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!created ? (
          <div className="space-y-4">
            <div>
              <label className="holy-label">Título</label>
              <input
                className="holy-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="holy-label">Usos máximos</label>
              <input
                type="number"
                className="holy-input"
                value={maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value))}
                min={1}
              />
            </div>

            <button
              onClick={handleCreate}
              disabled={loading}
              className="holy-btn-primary text-black"
            >
              {loading ? "Generando..." : "GENERAR QR GOLD"}
            </button>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="bg-gold/10 border border-gold/30 rounded-2xl p-4">
              <p className="font-display text-gold font-bold tracking-widest text-sm mb-2">
                {title}
              </p>
              <p className="font-mono text-xs text-text-muted break-all">
                {created}
              </p>
            </div>

            <p className="text-text-muted text-sm">QR generado exitosamente</p>

            <button onClick={onClose} className="holy-btn-secondary">
              CERRAR
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CreatePromoQrModal({
  profileId,
  onClose,
}: {
  profileId: string;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [form, setForm] = useState({
    title: "",
    description: "",
    maxUses: 100,
  });
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  async function handleCreate() {
    setLoading(true);

    const token = generateQrToken();

    await supabase.from("promo_qrs").insert({
      title: form.title,
      description: form.description,
      qr_token: token,
      max_uses: form.maxUses,
      created_by: profileId,
    });

    setCreated(token);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-end">
      <div className="w-full max-w-lg mx-auto bg-card border border-border rounded-t-3xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-lg font-bold tracking-widest">
            📢 QR PROMO
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-background text-text-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!created ? (
          <div className="space-y-4">
            <div>
              <label className="holy-label">Título</label>
              <input
                className="holy-input"
                placeholder="Shot gratis"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="holy-label">Descripción</label>
              <input
                className="holy-input"
                placeholder="Válido esta noche"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>

            <div>
              <label className="holy-label">Usos máximos</label>
              <input
                type="number"
                className="holy-input"
                value={form.maxUses}
                onChange={(e) =>
                  setForm({ ...form, maxUses: Number(e.target.value) })
                }
                min={1}
              />
            </div>

            <button
              onClick={handleCreate}
              disabled={loading}
              className="holy-btn-primary"
            >
              {loading ? "Generando..." : "GENERAR QR PROMO"}
            </button>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="bg-accent-purple/10 border border-accent-purple/30 rounded-2xl p-4">
              <p className="font-display text-accent-purple font-bold tracking-widest text-sm mb-2">
                {form.title}
              </p>
              <p className="font-mono text-xs text-text-muted break-all">
                {created}
              </p>
            </div>

            <p className="text-text-muted text-sm">QR promo generado</p>

            <button onClick={onClose} className="holy-btn-secondary">
              CERRAR
            </button>
          </div>
        )}
      </div>
    </div>
  );
}