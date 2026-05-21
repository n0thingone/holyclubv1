// @ts-nocheck
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toPng } from "html-to-image";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useActiveEvent } from "@/hooks/useActiveEvent";
import { useRrppStats } from "@/hooks/useRrppStats";
import {
  Copy,
  Check,
  Users,
  LogIn,
  Trophy,
  Zap,
  Wine,
  GlassWater,
  Share2,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Clock,
  Link2,
  Image as ImageIcon,
} from "lucide-react";
import type { RrppProfile, GuestRegistration } from "@/types";

export default function RrppPage() {
  const [rrpp, setRrpp] = useState<RrppProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showGuests, setShowGuests] = useState(false);
  const [guests, setGuests] = useState<GuestRegistration[]>([]);
  const [generating, setGenerating] = useState(false);
  const [eventImageUrl, setEventImageUrl] = useState("");
  const [storyImageDataUrl, setStoryImageDataUrl] = useState("");

  const storyRef = useRef<HTMLDivElement>(null);

  const { event } = useActiveEvent();
  const { stats } = useRrppStats(rrpp?.id, event?.id);
  const { profile: authProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (authLoading) return;

    if (!authProfile) {
      router.push("/login");
      return;
    }

    if (authProfile.role !== "rrpp") {
      router.push("/dashboard");
      return;
    }

    supabase
      .from("rrpp_profiles")
      .select("*")
      .eq("profile_id", authProfile.id)
      .single()
      .then(({ data }) => {
        setRrpp(data);
        setLoading(false);
      });
  }, [authProfile, authLoading, router, supabase]);

  useEffect(() => {
    if (!showGuests || !rrpp || !event) return;

    supabase
      .from("guest_registrations")
      .select("*")
      .eq("rrpp_id", rrpp.id)
      .eq("event_id", event.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setGuests((data as GuestRegistration[]) || []));
  }, [showGuests, rrpp, event, supabase]);

  useEffect(() => {
    if (!event?.id) {
      setEventImageUrl("");
      return;
    }

    const imageFromHook = (event as any)?.event_image_url;

    if (imageFromHook) {
      setEventImageUrl(imageFromHook);
      return;
    }

    supabase
      .from("events")
      .select("event_image_url")
      .eq("id", event.id)
      .maybeSingle()
      .then(({ data }) => {
        setEventImageUrl((data as any)?.event_image_url || "");
      });
  }, [event, supabase]);

  useEffect(() => {
    if (!rrpp || !event) return;

    const ch = supabase
      .channel(`rrpp-guests-${rrpp.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "guest_registrations",
          filter: `rrpp_id=eq.${rrpp.id}`,
        },
        async () => {
          const { data } = await supabase
            .from("guest_registrations")
            .select("*")
            .eq("rrpp_id", rrpp.id)
            .eq("event_id", event.id)
            .order("created_at", { ascending: false });

          setGuests((data as GuestRegistration[]) || []);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [rrpp, event, supabase]);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const myLink = rrpp ? `${appUrl}/lista/${rrpp.slug}` : "";
  const storyEventImageUrl = eventImageUrl || (event as any)?.event_image_url || "";

  useEffect(() => {
    if (!storyEventImageUrl) {
      setStoryImageDataUrl("");
      return;
    }

    let cancelled = false;

    async function loadStoryImageAsBase64() {
      try {
        const response = await fetch(storyEventImageUrl, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("No se pudo cargar la imagen del evento.");
        }

        const blob = await response.blob();
        const reader = new FileReader();

        reader.onloadend = () => {
          if (!cancelled) {
            setStoryImageDataUrl(String(reader.result || ""));
          }
        };

        reader.onerror = () => {
          if (!cancelled) {
            setStoryImageDataUrl("");
          }
        };

        reader.readAsDataURL(blob);
      } catch (error) {
        console.error("Error cargando imagen historia:", error);

        if (!cancelled) {
          setStoryImageDataUrl("");
        }
      }
    }

    loadStoryImageAsBase64();

    return () => {
      cancelled = true;
    };
  }, [storyEventImageUrl]);

  const bottle = stats.rewards.find((r) => r.reward_type === "bottle");
  const trigger = bottle?.trigger_count ?? 35;
  const pct = Math.min((stats.checkedIn / trigger) * 100, 100);

  function copyLink() {
    if (!myLink) return;

    navigator.clipboard.writeText(myLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareLink() {
    if (!myLink || !navigator.share) return;

    await navigator
      .share({
        title: "Anotate en Holy Club",
        text: "Anotate en mi lista para esta noche en HOLY.",
        url: myLink,
      })
      .catch(() => {});
  }

  async function generateStory() {
    if (!storyRef.current || !rrpp) return;

    try {
      setGenerating(true);

      if (storyEventImageUrl && !storyImageDataUrl) {
        alert("La imagen del evento todavía está cargando. Esperá 2 segundos y probá de nuevo.");
        setGenerating(false);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 900));

      const dataUrl = await toPng(storyRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        imagePlaceholder:
          "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
      });

      const response = await fetch(dataUrl);
      const blob = await response.blob();

      const fileName = `holy-story-${rrpp.slug || "rrpp"}.png`;

      const file = new File([blob], fileName, {
        type: "image/png",
      });

      if (
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [file] }) &&
        navigator.share
      ) {
        await navigator.share({
          title: "HOLY CLUB",
          text: "Anotate en mi lista para esta noche 🔥",
          files: [file],
        });

        return;
      }

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generando historia:", error);

      alert(
        "No se pudo generar la historia. Probá abrir la app desde Safari o Chrome."
      );
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <Zap className="w-10 h-10 text-accent-purple animate-pulse" />
      </div>
    );
  }
   console.log("RRPP PAGE NUEVO");
  return (
     
    <div className="min-h-dvh bg-background mesh-bg">
      <main className="px-4 py-6 space-y-5 max-w-sm mx-auto pb-10">
        {rrpp && (
          <div className="holy-card bg-gradient-card">
            <div className="flex items-center gap-1.5 mb-3">
              <Link2 className="w-3.5 h-3.5 text-accent-purple" />
              <p className="holy-label mb-0">MI LINK</p>
            </div>

            <div className="flex items-center gap-2 bg-background/60 rounded-xl px-3 py-2.5 mb-2">
              <span className="text-sm text-accent-purple flex-1 truncate font-mono">
                {myLink}
              </span>

              <button
                onClick={copyLink}
                className="flex-shrink-0 p-1.5 rounded-lg bg-card border border-border text-text-muted hover:text-accent-purple transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            {copied && (
              <p className="text-success text-xs animate-fade-in">
                ✓ Link copiado al portapapeles
              </p>
            )}

            <div className="grid grid-cols-1 gap-2 mt-3">
              <button
                onClick={copyLink}
                className="holy-btn-primary py-3 text-xs"
              >
                <Copy className="w-3.5 h-3.5 inline mr-1.5" />
                COPIAR LINK
              </button>

              <button
                onClick={generateStory}
                disabled={generating || (!!storyEventImageUrl && !storyImageDataUrl)}
                className="holy-btn-secondary py-3 text-xs disabled:opacity-60"
              >
                <ImageIcon className="w-3.5 h-3.5 inline mr-1.5" />
                {generating
                  ? "GENERANDO..."
                  : storyEventImageUrl && !storyImageDataUrl
                  ? "CARGANDO IMAGEN..."
                  : "GENERAR HISTORIA"}
              </button>

              {typeof navigator !== "undefined" && "share" in navigator && (
                <button
                  onClick={shareLink}
                  className="holy-btn-secondary py-3 text-xs"
                >
                  <Share2 className="w-3.5 h-3.5 inline mr-1.5" />
                  COMPARTIR LINK
                </button>
              )}
            </div>
          </div>
        )}

        {!event && (
          <div className="holy-card text-center py-8">
            <Clock className="w-10 h-10 mx-auto mb-2 text-text-muted opacity-30" />
            <p className="text-text-muted">Sin evento activo esta noche</p>
          </div>
        )}

        {event && (
          <div className="grid grid-cols-3 gap-3">
            <div className="stat-card">
              <div className="flex items-center gap-1 mb-1">
                <Users className="w-3.5 h-3.5 text-accent-purple" />
                <span className="stat-label">Anotados</span>
              </div>
              <span className="stat-value">{stats.registered}</span>
            </div>

            <div className="stat-card">
              <div className="flex items-center gap-1 mb-1">
                <LogIn className="w-3.5 h-3.5 text-success" />
                <span className="stat-label">Ingresos</span>
              </div>
              <span className="stat-value text-success">
                {stats.checkedIn}
              </span>
            </div>

            <div className="stat-card">
              <div className="flex items-center gap-1 mb-1">
                <Trophy className="w-3.5 h-3.5 text-gold" />
                <span className="stat-label">Posición</span>
              </div>
              <span className="stat-value text-gold">
                {stats.position > 0 ? `#${stats.position}` : "–"}
              </span>
            </div>
          </div>
        )}

        {event && bottle && (
          <div
            className={`holy-card ${
              bottle.status === "unlocked"
                ? "border-success/40 bg-success/5"
                : ""
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wine
                  className={`w-5 h-5 ${
                    bottle.status === "unlocked"
                      ? "text-success"
                      : "text-accent-purple"
                  }`}
                />
                <span className="font-display text-sm font-bold tracking-widest text-white">
                  {bottle.title.toUpperCase()}
                </span>
              </div>

              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border ${
                  bottle.status === "unlocked"
                    ? "bg-success/20 text-success border-success/30"
                    : bottle.status === "redeemed"
                    ? "bg-text-muted/20 text-text-muted border-text-muted/30"
                    : "bg-card text-text-muted border-border"
                }`}
              >
                {bottle.status === "locked"
                  ? `${stats.checkedIn}/${trigger}`
                  : bottle.status === "unlocked"
                  ? "🎉 GANADO"
                  : "✓ CANJEADO"}
              </span>
            </div>

            <div className="h-3 bg-background rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  bottle.status === "unlocked" || bottle.status === "redeemed"
                    ? "bg-success"
                    : "bg-gradient-purple"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>

            <p className="text-xs text-text-muted">
              {bottle.status === "locked"
                ? `Faltan ${Math.max(
                    0,
                    trigger - stats.checkedIn
                  )} ingresos para desbloquear`
                : bottle.status === "unlocked"
                ? "Premio desbloqueado. Revisalo en Mis Consumiciones."
                : "Premio ya canjeado esta noche"}
            </p>
          </div>
        )}

        {event && stats.benefits.length > 0 && (
          <div id="beneficios" className="holy-card scroll-mt-24">
            <p className="holy-label flex items-center gap-1.5 mb-3">
              <GlassWater className="w-3.5 h-3.5 text-accent-purple" />
              Beneficios de la noche
            </p>

            <div className="space-y-2">
              {stats.benefits.map((b) => (
                <div
                  key={b.id}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${
                    b.status === "redeemed"
                      ? "bg-background/30 opacity-60"
                      : "bg-accent-purple/10 border border-accent-purple/20"
                  }`}
                >
                  <span className="text-sm font-semibold">{b.title}</span>
                  <span
                    className={`text-xs font-bold uppercase tracking-widest ${
                      b.status === "redeemed"
                        ? "text-text-muted"
                        : "text-accent-purple"
                    }`}
                  >
                    {b.status === "redeemed" ? "CANJEADO" : "DISPONIBLE ✓"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {event && (
          <button
            onClick={() => setShowGuests(!showGuests)}
            className="holy-btn-secondary flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              MI LISTA ({stats.registered} anotados)
            </span>
            {showGuests ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        )}

        {showGuests && event && (
          <div className="holy-card animate-slide-up">
            {guests.length === 0 ? (
              <div className="text-center py-6">
                <Users className="w-8 h-8 mx-auto mb-2 text-text-muted opacity-30" />
                <p className="text-text-muted text-sm">Nadie anotado todavía</p>
                <p className="text-text-muted text-xs mt-1">
                  Compartí tu link para que se anoten
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {guests.map((g, i) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-text-muted w-5 font-mono">
                        {i + 1}
                      </span>

                      <div>
                        <p className="text-sm font-semibold text-text-primary leading-none">
                          {g.first_name} {g.last_name}
                        </p>

                        <p className="text-xs text-text-muted mt-0.5 font-mono">
                          DNI ···{g.dni_last3}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${
                        g.registration_status === "checked_in"
                          ? "bg-success/20 text-success"
                          : "bg-card text-text-muted"
                      }`}
                    >
                      {g.registration_status === "checked_in" ? (
                        <>
                          <UserCheck className="w-3 h-3" /> Ingresó
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" /> Pendiente
                        </>
                      )}
                    </span>
                  </div>
                ))}

                {guests.length > 0 && (
                  <button
                    onClick={() => {
                      const text = guests
                        .map((g, i) => `${i + 1}. ${g.first_name} ${g.last_name}`)
                        .join("\n");

                      navigator.clipboard.writeText(text);
                    }}
                    className="holy-btn-primary mt-4 w-full py-3 text-xs"
                  >
                    📋 COPIAR LISTA COMPLETA
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="fixed -left-[99999px] top-0 pointer-events-none opacity-0">
          <div
            ref={storyRef}
            style={{
              width: 1080,
              height: 1920,
              background:
                "linear-gradient(180deg, #08020d 0%, #15031c 45%, #050507 100%)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Arial, sans-serif",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {storyImageDataUrl && (
              <div
                style={{
                  position: "absolute",
                  inset: -44,
                  backgroundImage: `url("${storyImageDataUrl}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  opacity: 0.96,
                  filter:
                    "blur(7px) saturate(1.18) contrast(1.08) brightness(0.78)",
                  transform: "scale(1.05)",
                }}
              />
            )}

            {!storyImageDataUrl && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "radial-gradient(circle at 30% 18%, rgba(217,70,239,0.26), transparent 34%), radial-gradient(circle at 80% 20%, rgba(244,63,94,0.16), transparent 24%), linear-gradient(180deg, #08020d 0%, #16041f 55%, #050507 100%)",
                }}
              />
            )}

            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(10,2,16,0.22) 42%, rgba(0,0,0,0.48) 100%), radial-gradient(circle at 12% 10%, rgba(244,63,94,0.22), transparent 24%), radial-gradient(circle at 85% 18%, rgba(217,70,239,0.20), transparent 28%), radial-gradient(circle at 50% 96%, rgba(168,85,247,0.28), transparent 34%)",
              }}
            />

            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(90deg, rgba(244,63,94,0.10), transparent 16%, transparent 84%, rgba(217,70,239,0.12)), linear-gradient(180deg, rgba(255,255,255,0.02), transparent 18%)",
              }}
            />

            <div
              style={{
                width: 930,
                height: 1680,
                borderRadius: 64,
                padding: 2,
                background:
                  "linear-gradient(135deg, rgba(244,114,182,0.98) 0%, rgba(217,70,239,0.96) 38%, rgba(168,85,247,0.96) 72%, rgba(244,114,182,0.98) 100%)",
                boxShadow:
                  "0 0 110px rgba(217,70,239,0.52), 0 0 42px rgba(244,63,94,0.25), inset 0 0 26px rgba(255,255,255,0.16)",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 14,
                  borderRadius: 52,
                  border: "1px solid rgba(255,255,255,0.20)",
                  boxShadow:
                    "inset 0 0 70px rgba(255,255,255,0.05), inset 0 0 110px rgba(217,70,239,0.08)",
                  pointerEvents: "none",
                }}
              />

              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: 62,
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.075) 0%, rgba(217,70,239,0.055) 42%, rgba(0,0,0,0.18) 100%)",
                  padding: "72px 62px 58px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "radial-gradient(circle at 10% 8%, rgba(255,255,255,0.08), transparent 20%), radial-gradient(circle at 72% 35%, rgba(217,70,239,0.10), transparent 28%), linear-gradient(180deg, rgba(0,0,0,0.06) 0%, transparent 36%, rgba(0,0,0,0.30) 100%)",
                    pointerEvents: "none",
                  }}
                />

                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 240,
                    background:
                      "linear-gradient(180deg, rgba(0,0,0,0.36), transparent)",
                    pointerEvents: "none",
                  }}
                />

                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 18,
                      padding: "18px 28px",
                      borderRadius: 999,
                      background:
                        "linear-gradient(180deg, rgba(0,0,0,0.38), rgba(0,0,0,0.20))",
                      border: "1px solid rgba(255,255,255,0.18)",
                      boxShadow:
                        "0 0 42px rgba(217,70,239,0.28), inset 0 0 28px rgba(255,255,255,0.05)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <div
                      style={{
                        width: 58,
                        height: 58,
                        borderRadius: 18,
                        background:
                          "linear-gradient(135deg, rgba(244,114,182,1) 0%, rgba(217,70,239,1) 45%, rgba(168,85,247,1) 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#09090b",
                        fontSize: 30,
                        fontWeight: 900,
                        boxShadow: "0 0 34px rgba(217,70,239,0.55)",
                      }}
                    >
                      H
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 25,
                          letterSpacing: "0.34em",
                          color: "#ffffff",
                          fontWeight: 900,
                          textShadow: "0 3px 16px rgba(0,0,0,0.70)",
                        }}
                      >
                        HOLY CLUB
                      </div>

                      <div
                        style={{
                          marginTop: 7,
                          fontSize: 18,
                          color: "#f0abfc",
                          letterSpacing: "0.16em",
                          textTransform: "uppercase",
                          fontWeight: 900,
                        }}
                      >
                        Lista RRPP
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "16px 26px",
                      borderRadius: 999,
                      background:
                        "linear-gradient(180deg, rgba(217,70,239,0.28), rgba(88,28,135,0.26))",
                      border: "1px solid rgba(255,255,255,0.16)",
                      color: "#ffffff",
                      fontSize: 17,
                      fontWeight: 900,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      boxShadow:
                        "0 0 36px rgba(217,70,239,0.22), inset 0 0 20px rgba(255,255,255,0.04)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    VIP ACCESS
                  </div>
                </div>

                <div
                  style={{
                    position: "relative",
                    zIndex: 2,
                    display: "flex",
                    flexDirection: "column",
                    gap: 24,
                    marginTop: 130,
                  }}
                >
                  <div
                    style={{
                      fontSize: 122,
                      lineHeight: 0.9,
                      fontWeight: 900,
                      letterSpacing: "-0.055em",
                      textTransform: "uppercase",
                      textShadow:
                        "0 10px 38px rgba(0,0,0,0.96), 0 0 48px rgba(255,255,255,0.16), 0 0 40px rgba(217,70,239,0.25)",
                    }}
                  >
                    ANOTATE
                    <br />
                    EN MI
                    <br />
                    LISTA
                  </div>

                  <div
                    style={{
                      display: "inline-flex",
                      alignSelf: "flex-start",
                      padding: "18px 30px",
                      borderRadius: 999,
                      background:
                        "linear-gradient(180deg, rgba(0,0,0,0.42), rgba(0,0,0,0.24))",
                      border: "1px solid rgba(255,255,255,0.16)",
                      color: "#ffffff",
                      fontSize: 31,
                      fontWeight: 900,
                      boxShadow:
                        "0 0 34px rgba(217,70,239,0.22), inset 0 0 20px rgba(255,255,255,0.04)",
                      backdropFilter: "blur(6px)",
                      textShadow: "0 4px 16px rgba(0,0,0,0.72)",
                    }}
                  >
                    {rrpp?.display_name || "RRPP HOLY"}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      flexWrap: "wrap",
                      maxWidth: 760,
                    }}
                  >
                    <div
                      style={{
                        padding: "16px 26px",
                        borderRadius: 999,
                        background:
                          "linear-gradient(180deg, rgba(217,70,239,0.25), rgba(88,28,135,0.18))",
                        border: "1px solid rgba(240,171,252,0.55)",
                        color: "#ffffff",
                        fontSize: 22,
                        fontWeight: 900,
                        textTransform: "uppercase",
                        letterSpacing: "0.075em",
                        boxShadow:
                          "0 0 34px rgba(217,70,239,0.38), inset 0 0 22px rgba(255,255,255,0.05)",
                        backdropFilter: "blur(6px)",
                      }}
                    >
                      ◷ Lista free hasta 2:30 AM
                    </div>

                    <div
                      style={{
                        padding: "16px 26px",
                        borderRadius: 999,
                        background:
                          "linear-gradient(180deg, rgba(34,197,94,0.22), rgba(5,46,22,0.20))",
                        border: "1px solid rgba(74,222,128,0.58)",
                        color: "#86efac",
                        fontSize: 22,
                        fontWeight: 900,
                        textTransform: "uppercase",
                        letterSpacing: "0.075em",
                        boxShadow:
                          "0 0 34px rgba(34,197,94,0.28), inset 0 0 20px rgba(255,255,255,0.04)",
                        backdropFilter: "blur(6px)",
                      }}
                    >
                      $ Sumá créditos si tenés cuenta
                    </div>

                    {event?.name && (
                      <div
                        style={{
                          padding: "16px 26px",
                          borderRadius: 999,
                          background:
                            "linear-gradient(180deg, rgba(59,130,246,0.24), rgba(30,58,138,0.22))",
                          border: "1px solid rgba(96,165,250,0.58)",
                          color: "#93c5fd",
                          fontSize: 22,
                          fontWeight: 900,
                          letterSpacing: "0.065em",
                          textTransform: "uppercase",
                          boxShadow:
                            "0 0 34px rgba(59,130,246,0.26), inset 0 0 20px rgba(255,255,255,0.04)",
                          backdropFilter: "blur(6px)",
                        }}
                      >
                        ▣ Evento: {event.name}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 34,
                      lineHeight: 1.34,
                      color: "rgba(255,255,255,0.96)",
                      maxWidth: 780,
                      textShadow: "0 5px 24px rgba(0,0,0,0.88)",
                    }}
                  >
                    Entrá desde mi link y anotate para esta noche.
                    <br />
                    Tu QR se genera después del registro.
                  </div>
                </div>

                <div
                  style={{
                    position: "relative",
                    zIndex: 2,
                    borderRadius: 34,
                    padding: "34px 30px",
                    background:
                      "linear-gradient(180deg, rgba(0,0,0,0.34), rgba(0,0,0,0.24))",
                    border: "1px solid rgba(240,171,252,0.32)",
                    boxShadow:
                      "0 0 70px rgba(217,70,239,0.26), inset 0 0 28px rgba(255,255,255,0.045)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 21,
                      letterSpacing: "0.20em",
                      textTransform: "uppercase",
                      color: "#d8b4fe",
                      marginBottom: 18,
                      fontWeight: 900,
                    }}
                  >
                    Entrá desde mi link
                  </div>

                  <div
                    style={{
                      borderRadius: 22,
                      padding: "22px 24px",
                      background: "rgba(0,0,0,0.54)",
                      border: "1px solid rgba(217,70,239,0.28)",
                      boxShadow: "inset 0 0 22px rgba(0,0,0,0.22)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 27,
                        color: "#ffffff",
                        wordBreak: "break-word",
                        fontWeight: 800,
                        lineHeight: 1.35,
                        textShadow: "0 3px 18px rgba(0,0,0,0.8)",
                      }}
                    >
                      🔗 {myLink}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}