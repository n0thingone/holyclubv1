import { createClient } from "@/lib/supabase/server";
import GuestRegistrationClient from "./GuestRegistrationClient";

export default async function ListaPage({
  params,
}: {
  params: { slug: string };
}) {
  // Server Component — usar cliente server, nunca el browser singleton
  const supabase = createClient();

  const { data: rrpp } = await supabase
    .from("rrpp_profiles")
    .select("*, profiles(full_name)")
    .eq("slug", params.slug)
    .eq("active", true)
    .single();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("status", "active")
    .single();

  const isRegistrationOpen = event?.registration_until
    ? new Date() <= new Date(event.registration_until)
    : !!event;

  return (
    <GuestRegistrationClient
      rrpp={rrpp}
      event={event}
      isRegistrationOpen={isRegistrationOpen}
    />
  );
}
