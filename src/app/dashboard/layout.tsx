"use client";

import type { ReactNode } from "react";
import DashboardShell from "@/components/navigation/DashboardShell";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DashboardShell title="HOLY CLUB" onlineCount={128}>
      <div className="min-h-screen w-full">{children}</div>
    </DashboardShell>
  );
}