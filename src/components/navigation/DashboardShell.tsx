"use client";

import { ReactNode, useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Gift, History, Sparkles, ScanLine } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface DashboardShellProps {
  children: ReactNode;
}

type NavItem = {
  href: string;
  label: string;
  icon: any;
  match?: (pathname: string) => boolean;
};

export default function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const { profile } = useAuth();

  const role = profile?.role;

  // 🔥 ROLES CORRECTOS (FIX TOTAL)
  const canSeeBarScanner =
    role === "admin" ||
    role === "bar" ||
    role === "cashier";

  const isClientView =
    pathname.startsWith("/dashboard/puntos") ||
    pathname.startsWith("/dashboard/beneficios");

  // 🔥 CRÉDITOS LIVE
  const profileCredits = Number((profile as any)?.holy_points_balance ?? 0);
  const [liveCredits, setLiveCredits] = useState(profileCredits);

  useEffect(() => {
    setLiveCredits(profileCredits);
  }, [profileCredits]);

  useEffect(() => {
    function onCreditsUpdated(event: Event) {
      const customEvent = event as CustomEvent<number>;
      if (typeof customEvent.detail === "number") {
        setLiveCredits(customEvent.detail);
      }
    }

    window.addEventListener(
      "holy-credits-updated",
      onCreditsUpdated as EventListener
    );

    return () => {
      window.removeEventListener(
        "holy-credits-updated",
        onCreditsUpdated as EventListener
      );
    };
  }, []);

  const navItems = useMemo<NavItem[]>(() => {
    const isAdmin = canSeeBarScanner;

    const homeHref = isAdmin
      ? "/dashboard"
      : "/dashboard/puntos/home";

    const base: NavItem[] = [
      {
        href: homeHref,
        label: "HOME",
        icon: Home,
        match: (p) =>
          p === "/dashboard" ||
          p === "/dashboard/puntos" ||
          p === "/dashboard/puntos/home",
      },
      {
        href: "/dashboard/puntos",
        label: "CANJEAR",
        icon: Gift,
        match: (p) => p === "/dashboard/puntos",
      },
      {
        href: "/dashboard/puntos/movimientos",
        label: "ULT. MOV.",
        icon: History,
        match: (p) => p.startsWith("/dashboard/puntos/movimientos"),
      },
      {
        href: "/dashboard/beneficios",
        label: "BENEF.",
        icon: Sparkles,
        match: (p) => p.startsWith("/dashboard/beneficios"),
      },
    ];

    // 🔥 SOLO ADMIN/BARRA
    if (canSeeBarScanner && !isClientView) {
      base.splice(3, 0, {
        href: "/dashboard/scanner",
        label: "BARRA",
        icon: ScanLine,
        match: (p) => p.startsWith("/dashboard/scanner"),
      });
    }

    return base;
  }, [canSeeBarScanner, isClientView]);

  return (
    <div className="min-h-screen bg-black text-white pb-20">

      {/* HEADER */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">

          {/* LOGO */}
          <div className="text-lg font-bold tracking-wide">
            HOLY CLUB
          </div>

          {/* DERECHA */}
          <div className="flex items-center gap-3">

            <div className="bg-emerald-500/20 text-emerald-300 text-xs px-3 py-1 rounded-full">
              EN LÍNEA 128
            </div>

            <div className="bg-fuchsia-500/20 text-fuchsia-300 text-xs px-3 py-1 rounded-full">
              {liveCredits.toLocaleString("es-AR")} CRÉDITOS
            </div>

          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="pt-16">
        {children}
      </div>

      {/* BOTTOM NAV */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-fuchsia-500/20 bg-[#1a0123]/95 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-7xl px-2 py-2">
          <div className="grid grid-cols-5 items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.match?.(pathname);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-[62px] flex-col items-center justify-center rounded-2xl px-2 py-2 text-[10px] font-semibold transition ${
                    active
                      ? "bg-fuchsia-500 text-white shadow-[0_0_20px_rgba(217,70,239,0.35)]"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="mb-1 h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}