import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  switch (profile.role) {
    case "admin":
      redirect("/dashboard");
    case "cashier":
      redirect("/dashboard/scanner");
    case "bar":
      redirect("/dashboard/bar");
    case "rrpp":
      redirect("/rrpp");
    default:
      redirect("/login");
  }
}
