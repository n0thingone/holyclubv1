// @ts-nocheck
"use client";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import { ReactNode, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  Home,
  Gift,
  History,
  Sparkles,
  UserCircle2,
  LogOut,
  ScanLine,
  MoreVertical,
  Trophy,
  Link2,
  Martini,
  QrCode,
  Clock3,
  Shield,
  CalendarPlus2,
  ClipboardList,
  Ticket,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import HolyCoin from "@/components/ui/HolyCoin";
import { getSupabaseClient } from "@/lib/supabase/client";

type MenuEntry = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: MenuEntry & {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold transition duration-200 ${
        active
          ? "bg-fuchsia-500/22 text-fuchsia-200 shadow-[0_0_28px_rgba(217,70,239,0.24)]"
          : "text-white/82 hover:bg-white/8"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

export default function DashboardShell({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
 const { profile, user, signOut, loading: authLoading } = useAuth();
const router = useRouter();
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [freeBoxes, setFreeBoxes] = useState(0);
  const [liveCredits, setLiveCredits] = useState(
    Number((profile as any)?.holy_points_balance ?? 0)
  );

  const headerRef = useRef<HTMLDivElement | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
 
  useEffect(() => {
  if (authLoading) return;

  if (!user || !profile) {
    const redirectTo = pathname || "/dashboard/puntos/home";
    router.replace(`/login?redirect=${encodeURIComponent(redirectTo)}`);
  }
}, [authLoading, user, profile, pathname, router]);


}
  const credits = Number(liveCredits ?? 0);

  useEffect(() => {
    setLiveCredits(Number((profile as any)?.holy_points_balance ?? 0));
  }, [profile?.holy_points_balance]);

  useEffect(() => {
    function handleCreditsUpdate(event: Event) {
      const customEvent = event as CustomEvent<number>;
      const nextCredits = Number(customEvent.detail ?? 0);

      if (Number.isFinite(nextCredits)) {
        setLiveCredits(nextCredits);
      }
    }

    window.addEventListener("holy-credits-updated", handleCreditsUpdate);

    return () => {
      window.removeEventListener("holy-credits-updated", handleCreditsUpdate);
    };
  }, []);

  useEffect(() => {
    async function loadFreeBoxes() {
      if (!user?.id) {
        setFreeBoxes(0);
        return;
      }

      const { data, error } = await supabase
        .from("holy_user_progress")
        .select("free_boxes")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error cargando free_boxes en DashboardShell:", error);
        return;
      }

      setFreeBoxes(Number(data?.free_boxes ?? 0));
    }

    void loadFreeBoxes();
  }, [user?.id, profile?.id, menuOpen, supabase]);

  const role = String((profile as any)?.role || "").toLowerCase();

  const isAdmin =
    role === "admin" || role === "cashier" || role === "cajero";
  const isRrpp = role === "rrpp";
  const isClient = !isAdmin && !isRrpp;

  const displayName =
    String((profile as any)?.full_name || "").trim() ||
    String((profile as any)?.name || "").trim() ||
    String((profile as any)?.username || "").trim() ||
    user?.email?.split("@")[0]?.toUpperCase() ||
    "USUARIO";

  const roleLabel = isAdmin ? "ADMIN" : isRrpp ? "RRPP" : "CLIENTE";
  const currentTab = searchParams.get("tab") || "";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 18);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    function updateHeaderHeight() {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    }

    updateHeaderHeight();

    const raf1 = requestAnimationFrame(updateHeaderHeight);
    const raf2 = requestAnimationFrame(() => {
      requestAnimationFrame(updateHeaderHeight);
    });

    const t1 = setTimeout(updateHeaderHeight, 120);
    const t2 = setTimeout(updateHeaderHeight, 350);
    const t3 = setTimeout(updateHeaderHeight, 800);

    let observer: ResizeObserver | null = null;

    if (headerRef.current && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateHeaderHeight);
      observer.observe(headerRef.current);
    }

    window.addEventListener("resize", updateHeaderHeight);
    window.addEventListener("orientationchange", updateHeaderHeight);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      observer?.disconnect();
      window.removeEventListener("resize", updateHeaderHeight);
      window.removeEventListener("orientationchange", updateHeaderHeight);
    };
  }, []);

  const bottomNavItems = [
    { href: "/dashboard/puntos/home", label: "HOME", icon: Home },
    { href: "/dashboard/puntos", label: "CANJEAR", icon: Gift },
    {
      href: "/dashboard/puntos/movimientos",
      label: "MOVIM.",
      icon: History,
    },
    isAdmin
      ? { href: "/dashboard/scanner", label: "SCAN QR", icon: ScanLine }
      : { href: "/dashboard/beneficios", label: "BENEF.", icon: Sparkles },
    { href: "/dashboard/perfil", label: "PERFIL", icon: UserCircle2 },
  ];

  const clientItems: MenuEntry[] = [
    { href: "/dashboard/perfil", label: "Perfil", icon: UserCircle2 },
    { href: "/dashboard/puntos", label: "Canjear", icon: Gift },
    {
      href: "/dashboard/puntos/movimientos?tab=movimientos",
      label: "Ult movimientos",
      icon: Clock3,
    },
    {
      href: "/dashboard/puntos/movimientos?tab=qr",
      label: "Mis QR",
      icon: QrCode,
    },
    {
      href: "/dashboard/beneficios",
      label: "Beneficios",
      icon: Sparkles,
    },
  ];

  const rrppItems: MenuEntry[] = [
    { href: "/dashboard/perfil", label: "Perfil", icon: UserCircle2 },
    {
      href: "/dashboard/rrpp-panel",
      label: "Mis links lista",
      icon: Link2,
    },
    { href: "/dashboard/ranking", label: "Ranking", icon: Trophy },
    {
      href: "/dashboard/rrpp-consumiciones",
      label: "Mis Consumiciones",
      icon: Martini,
    },
    {
      href: "/dashboard/puntos/movimientos?tab=movimientos",
      label: "Ult movimientos",
      icon: Clock3,
    },
    {
      href: "/dashboard/puntos/movimientos?tab=qr",
      label: "Mis QR",
      icon: QrCode,
    },
    {
      href: "/dashboard/beneficios",
      label: "Beneficios",
      icon: Sparkles,
    },
  ];

  const adminItems: MenuEntry[] = [
    { href: "/dashboard/perfil", label: "Perfil", icon: UserCircle2 },
    {
      href: "/dashboard/admin/puntos",
      label: "Agregar creditos / Rol",
      icon: Shield,
    },
    {
      href: "/dashboard/admin/eventos/crear",
      label: "Crear evento",
      icon: CalendarPlus2,
    },
    {
      href: "/dashboard/admin/eventos/resumen",
      label: "Resumen evento",
      icon: ClipboardList,
    },
    {
      href: "/dashboard/scanner",
      label: "Scanner QR",
      icon: ScanLine,
    },
    {
      href: "/dashboard/gold",
      label: "Invitaciones GOLD",
      icon: Ticket,
    },
    { href: "/dashboard/puntos", label: "Canjear", icon: Gift },
    {
      href: "/dashboard/puntos/movimientos?tab=movimientos",
      label: "Ult movimientos",
      icon: Clock3,
    },
    {
      href: "/dashboard/puntos/movimientos?tab=qr",
      label: "Mis QR",
      icon: QrCode,
    },
    {
      href: "/dashboard/beneficios",
      label: "Beneficios",
      icon: Sparkles,
    },
  ];

  function isHrefActive(href: string) {
    const [basePath, queryString] = href.split("?");

    if (pathname !== basePath) return false;
    if (!queryString) return true;

    const params = new URLSearchParams(queryString);
    const hrefTab = params.get("tab");

    if (hrefTab) return currentTab === hrefTab;

    return true;
  }

  async function handleLogout() {
    await signOut();
    window.location.href = "/login";
  }

  function closeMenu() {
    if (menuClosing) return;

    setMenuClosing(true);

    setTimeout(() => {
      setMenuOpen(false);
      setMenuClosing(false);
    }, 260);
  }

  function openMenu() {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(18);
    }

    setMenuClosing(false);
    setMenuOpen(true);
  }

  function handleMenuTouchStart(e: React.TouchEvent) {
    touchStartXRef.current = e.touches[0].clientX;
    touchEndXRef.current = null;
  }

  function handleMenuTouchMove(e: React.TouchEvent) {
    touchEndXRef.current = e.touches[0].clientX;
  }

  function handleMenuTouchEnd() {
    const startX = touchStartXRef.current;
    const endX = touchEndXRef.current;

    if (startX === null || endX === null) return;

    const distance = startX - endX;

    if (distance > 70) {
      closeMenu();
    }

    touchStartXRef.current = null;
    touchEndXRef.current = null;
  }
  if (authLoading || !user || !profile) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-black text-white">
      Cargando...
    </div>
  );
}
  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#050507] pb-24 text-white">
      <style jsx global>{`
        @keyframes holyMenuButtonPulse {
          0% {
            box-shadow:
              0 0 0 rgba(217, 70, 239, 0),
              0 0 0 rgba(217, 70, 239, 0);
          }
          50% {
            box-shadow:
              0 0 20px rgba(217, 70, 239, 0.35),
              0 0 38px rgba(168, 85, 247, 0.2);
          }
          100% {
            box-shadow:
              0 0 12px rgba(217, 70, 239, 0.18),
              0 0 26px rgba(168, 85, 247, 0.14);
          }
        }

        @keyframes holyWiggle {
          0%,
          100% {
            transform: rotate(0deg);
          }
          20% {
            transform: rotate(-6deg);
          }
          40% {
            transform: rotate(5deg);
          }
          60% {
            transform: rotate(-4deg);
          }
          80% {
            transform: rotate(3deg);
          }
        }

        @keyframes holySidebarOverlayIn {
          0% {
            opacity: 0;
            backdrop-filter: blur(0px);
          }
          100% {
            opacity: 1;
            backdrop-filter: blur(2px);
          }
        }

        @keyframes holySidebarIn {
          0% {
            transform: translateX(-36px) scale(0.985);
            opacity: 0;
          }
          65% {
            transform: translateX(6px) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }

        @keyframes holySidebarOut {
          0% {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateX(-110%) scale(0.985);
            opacity: 0;
          }
        }

        @keyframes holyHeaderGlow {
          0%,
          100% {
            opacity: 0.55;
          }
          50% {
            opacity: 0.9;
          }
        }

        .holy-menu-button {
          animation: holyMenuButtonPulse 2.2s ease-in-out infinite;
        }

        .holy-menu-button:hover .holy-menu-dots,
        .holy-menu-button:active .holy-menu-dots {
          animation: holyWiggle 0.35s ease-in-out;
        }

        .holy-sidebar-overlay-enter {
          animation: holySidebarOverlayIn 0.22s ease-out;
        }

        .holy-sidebar-enter {
          animation: holySidebarIn 0.28s cubic-bezier(0.22, 1, 0.36, 1);
          transform-origin: left center;
        }

        .holy-sidebar-exit {
          animation: holySidebarOut 0.26s ease-in forwards;
          transform-origin: left center;
        }

        .holy-header-glow {
          animation: holyHeaderGlow 2.8s ease-in-out infinite;
        }
      `}</style>

    <div
  ref={headerRef}
  className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/78 backdrop-blur-2xl pt-[env(safe-area-inset-top)]"
>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px holy-header-glow bg-gradient-to-r from-transparent via-fuchsia-400/80 to-transparent" />

        <div
          className={`mx-auto grid max-w-6xl grid-cols-[92px_1fr_92px] items-center px-4 transition-all duration-300 ${
            scrolled ? "py-2" : "py-3"
          }`}
        >
          <div className="flex justify-start">
            <button
              onClick={openMenu}
              className={`holy-menu-button flex shrink-0 items-center gap-2 rounded-2xl border border-fuchsia-400/25 bg-fuchsia-500/10 px-3 text-white/80 transition-all duration-300 hover:scale-[1.04] hover:bg-fuchsia-500/18 hover:text-white active:scale-95 ${
                scrolled ? "h-8" : "h-9"
              }`}
              aria-label="Abrir menú"
            >
              <MoreVertical
                className={`holy-menu-dots transition-all duration-300 ${
                  scrolled ? "h-4 w-4" : "h-[18px] w-[18px]"
                }`}
              />
              <span
                className={`font-black uppercase tracking-[0.16em] text-fuchsia-100 transition-all duration-300 ${
                  scrolled ? "text-[9px]" : "text-[10px]"
                }`}
              >
                MENÚ
              </span>
            </button>
          </div>

          <div className="min-w-0 text-center">
            <div
              className={`uppercase tracking-[0.30em] text-fuchsia-300 transition-all duration-300 ${
                scrolled ? "text-[9px]" : "text-[11px]"
              }`}
            >
              HOLY CLUB
            </div>
            <div
              className={`whitespace-nowrap font-black transition-all duration-300 ${
                scrolled
                  ? "text-[16px] sm:text-[17px]"
                  : "text-[18px] sm:text-[19px]"
              }`}
            >
              {title || "HOLY CLUB"}
            </div>
          </div>

          <div className="flex justify-end">
            <div
              className={`relative flex shrink-0 items-center gap-1.5 rounded-full border border-fuchsia-400/25 bg-gradient-to-r from-fuchsia-500/18 to-violet-500/12 shadow-[0_0_28px_rgba(217,70,239,0.25)] transition-all duration-300 ${
                scrolled ? "px-1.5 py-1" : "px-2 py-1"
              }`}
            >
              <div className="pointer-events-none absolute inset-0 rounded-full bg-fuchsia-500/10 blur-md" />

              <div
                className={`relative z-10 flex items-center justify-center rounded-full bg-fuchsia-500 shadow-[0_0_20px_rgba(217,70,239,0.58)] transition-all duration-300 ${
                  scrolled ? "h-7 w-7" : "h-8 w-8"
                }`}
              >
                <HolyCoin size={scrolled ? 17 : 20} />
              </div>

              <span
                className={`relative z-10 font-black leading-none transition-all duration-300 ${
                  scrolled ? "text-[12px]" : "text-[13px]"
                }`}
              >
                {credits.toLocaleString("es-AR")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {menuOpen && (
        <>
          <button
            aria-label="Cerrar menú"
            className="holy-sidebar-overlay-enter fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px]"
            onClick={closeMenu}
          />

          <aside
            onTouchStart={handleMenuTouchStart}
            onTouchMove={handleMenuTouchMove}
            onTouchEnd={handleMenuTouchEnd}
            className={`${
              menuClosing ? "holy-sidebar-exit" : "holy-sidebar-enter"
            } fixed top-0 left-0 z-[70] flex h-full w-[88%] max-w-[372px] flex-col border-r border-fuchsia-500/15 bg-[linear-gradient(180deg,#160722_0%,#0f081b_58%,#09070f_100%)] shadow-[0_0_70px_rgba(0,0,0,0.52)]`}
          >
            <div className="border-b border-white/10 px-5 pb-5 pt-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-fuchsia-400/25 bg-fuchsia-500/12 shadow-[0_0_36px_rgba(217,70,239,0.24)]">
                    <span className="text-lg font-black text-fuchsia-200">
                      H
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-[18px] font-black uppercase">
                      {displayName}
                    </div>
                    <div className="mt-1 inline-flex items-center rounded-full border border-fuchsia-400/25 bg-fuchsia-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-fuchsia-200">
                      {roleLabel}
                    </div>
                  </div>
                </div>

                <button
                  onClick={closeMenu}
                  className="rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white active:scale-95"
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-2xl border border-fuchsia-400/15 bg-white/5 px-4 py-3.5 shadow-[0_0_24px_rgba(217,70,239,0.10)]">
                <div className="mb-1 text-[11px] uppercase tracking-[0.24em] text-white/45">
                  Puntos
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <HolyCoin size={24} />
                    <span className="text-[22px] font-black">
                      {credits.toLocaleString("es-AR")}
                    </span>
                  </div>

                  {freeBoxes > 0 ? (
                    <Link
                      href="/dashboard/beneficios/mystery-box"
                      onClick={closeMenu}
                      className="relative flex h-[68px] w-[64px] shrink-0 flex-col items-center justify-center rounded-2xl border border-amber-300/45 bg-gradient-to-b from-amber-400/20 via-yellow-300/10 to-amber-950/20 px-2 pb-2 pt-2 text-center text-amber-100 shadow-[0_0_24px_rgba(251,191,36,0.26)] transition hover:scale-[1.05] active:scale-95"
                      title="Abrir Holy Boxes"
                    >
                      <span className="mb-1 block text-[17px] leading-none drop-shadow-[0_0_8px_rgba(251,191,36,0.75)]">
                        🎁
                      </span>

                      <span className="block text-[9px] font-black uppercase leading-[0.9] tracking-[0.12em] text-amber-100">
                        HOLY
                      </span>

                      <span className="mt-0.5 block text-[9px] font-black uppercase leading-[0.9] tracking-[0.12em] text-amber-100">
                        BOXES
                      </span>

                      <span className="mt-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-300/25 px-1 text-[9px] font-black leading-none text-amber-50">
                        {freeBoxes}
                      </span>
                    </Link>
                  ) : null}
                </div>

                {user?.email ? (
                  <div className="mt-2 truncate text-xs text-white/45">
                    {user.email}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
              {isClient && (
                <section>
                  <div className="mb-3 px-2 text-[11px] font-bold uppercase tracking-[0.22em] text-fuchsia-300/85">
                    Cliente
                  </div>
                  <div className="space-y-2">
                    {clientItems.map((item) => (
                      <SidebarLink
                        key={item.label}
                        {...item}
                        active={isHrefActive(item.href)}
                        onClick={closeMenu}
                      />
                    ))}
                  </div>
                </section>
              )}

              {isRrpp && (
                <section>
                  <div className="mb-3 px-2 text-[11px] font-bold uppercase tracking-[0.22em] text-fuchsia-300/85">
                    RRPP
                  </div>
                  <div className="space-y-2">
                    {rrppItems.map((item) => (
                      <SidebarLink
                        key={item.label}
                        {...item}
                        active={isHrefActive(item.href)}
                        onClick={closeMenu}
                      />
                    ))}
                  </div>
                </section>
              )}

              {isAdmin && (
                <section>
                  <div className="mb-3 px-2 text-[11px] font-bold uppercase tracking-[0.22em] text-fuchsia-300/85">
                    Admin
                  </div>
                  <div className="space-y-2">
                    {adminItems.map((item) => (
                      <SidebarLink
                        key={item.label}
                        {...item}
                        active={isHrefActive(item.href)}
                        onClick={closeMenu}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="border-t border-white/10 p-4">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-semibold text-red-300 transition hover:bg-red-500/10 hover:text-red-200 active:scale-[0.99]"
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </aside>
        </>
      )}

<div className="pt-[74px] transition-all duration-300">
  {children}
</div>
<InstallPrompt />
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-fuchsia-500/20 bg-[#12041b]/90 backdrop-blur-xl">
        <div className="grid grid-cols-5 px-2 py-2">
          {bottomNavItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center rounded-xl py-2 text-[10px] font-bold transition-all duration-200 ${
                  active
                    ? "bg-fuchsia-500/20 text-fuchsia-200"
                    : "text-white/50"
                }`}
              >
                <Icon className="mb-1 h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}