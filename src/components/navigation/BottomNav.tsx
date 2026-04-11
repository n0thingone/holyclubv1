"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Home,
  Gift,
  ArrowLeftRight,
  Sparkles,
  ScanLine,
} from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();
  const { profile, loading } = useAuth();

  if (loading) return null;

  const role = profile?.role;

  const canSeeScanner =
    role === "admin" ||
    role === "bar" ||
    role === "cashier";

  const homeHref = canSeeScanner
    ? "/dashboard"
    : "/dashboard/puntos/home";

  const items = [
    { href: homeHref, label: "HOME", icon: Home },
    { href: "/dashboard/puntos", label: "CANJEAR", icon: Gift },
    {
      href: "/dashboard/puntos/movimientos",
      label: "MOVIM.",
      icon: ArrowLeftRight,
    },
    {
      href: "/dashboard/puntos/beneficios",
      label: "BENEF.",
      icon: Sparkles,
    },
  ];

  if (canSeeScanner) {
    items.splice(3, 0, {
      href: "/dashboard/scanner",
      label: "SCAN QR",
      icon: ScanLine,
    });
  }

  const isActive = (href: string) => {
    if (href === "/dashboard/scanner") {
      return pathname.startsWith("/dashboard/scanner");
    }
    return pathname === href;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-fuchsia-500/20 bg-[#1a0123]/95 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-7xl px-2 py-2">
        <div
          className={`grid items-center gap-2 ${
            items.length === 5 ? "grid-cols-5" : "grid-cols-4"
          }`}
        >
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[62px] flex-col items-center justify-center rounded-2xl px-2 py-2 text-[10px] font-semibold transition ${
                  active
                    ? "bg-fuchsia-500 text-white"
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
  );
}