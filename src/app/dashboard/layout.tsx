"use client";

import type { ReactNode } from "react";
import DashboardShell from "@/components/navigation/DashboardShell";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
   <DashboardShell title="HOLY CLUB">
      <div className="min-h-screen w-full">{children}</div>
    </DashboardShell>
  );
}