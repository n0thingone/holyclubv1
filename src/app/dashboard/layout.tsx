"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  QrCode,
  Trophy,
  GlassWater,
  LogOut,
  Zap,
  Users,
  History,
  Crown,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { href: "/dashboard",             icon: LayoutDashboard, label: "Home",     roles: ["admin"] },
  { href: "/dashboard/scanner",     icon: QrCode,          label: "Taquilla", roles: ["admin", "cashier"] },
  { href: "/dashboard/bar",         icon: GlassWater,      label: "Barra",    roles: ["admin", "bar"] },
  { href: "/dashboard/ranking",     icon: Trophy,          label: "Ranking",  roles: ["admin", "cashier", "bar"] },
  { href: "/dashboard/rrpp-panel",  icon: Users,           label: "RRPP",     roles: ["admin"] },
  { href: "/dashboard/gold",        icon: Crown,           label: "Gold",     roles: ["admin"] },
  { href: "/dashboard/history",     icon: History,         label: "Historial",roles: ["admin"] },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !profile) {
      console.log("[DASHBOARD] No profile, redirecting to login");
      router.replace("/login");
    }
  }, [profile, loading, router]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Zap className="w-10 h-10 text-accent-purple animate-pulse" />
          <p className="text-text-muted text-sm tracking-widest">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const allowedNav = navItems.filter((item) =>
    item.roles.includes(profile.role)
  );

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-purple flex items-center justify-center">
              <Zap className="w-4 h-4 text-black" fill="black" />
            </div>
            <span className="font-display text-sm font-bold tracking-widest text-white">
              HOLY
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-text-muted leading-none">
                {profile.role.toUpperCase()}
              </p>
              <p className="text-xs text-accent-purple font-semibold leading-none mt-0.5">
                {profile.full_name.split(" ")[0]}
              </p>
            </div>
            <button
              onClick={async () => {
                await signOut();
                router.push("/login");
              }}
              className="p-2 rounded-lg bg-card border border-border text-text-muted hover:text-danger hover:border-danger/50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto pb-24">{children}</main>

      {/* Bottom nav */}
      {allowedNav.length > 1 && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border">
          <div className="flex">
            {allowedNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 transition-colors ${
                    isActive
                      ? "text-accent-purple"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${isActive ? "drop-shadow-[0_0_8px_rgba(190,113,255,0.8)]" : ""}`}
                  />
                  <span className="text-[10px] tracking-widest uppercase font-semibold">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
