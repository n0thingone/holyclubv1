export const dynamic = "force-dynamic";
export const revalidate = 0;

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