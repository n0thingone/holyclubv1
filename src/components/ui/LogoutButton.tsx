"use client";

import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function LogoutButton() {
  const { signOut } = useAuth();

  return (
    <button
      onClick={signOut}
      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/70 transition hover:bg-red-500/20 hover:text-red-300"
    >
      <LogOut className="h-4 w-4" />
      Salir
    </button>
  );
}