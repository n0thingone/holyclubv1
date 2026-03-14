import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // si no está logueado → login
  if (!user) {
    redirect("/login");
  }

  // si está logueado → panel
  redirect("/panel");
}