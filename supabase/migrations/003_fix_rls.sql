-- ============================================================
-- HOLY CLUB — RLS Policies (idempotente, re-ejecutable)
-- Borra TODAS las policies existentes en cada tabla
-- y las recrea desde cero con la lógica correcta por rol.
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- PROFILES
-- ══════════════════════════════════════════════════════════════
do $$ declare r record; begin
  for r in select policyname from pg_policies where tablename = 'profiles' and schemaname = 'public'
  loop execute 'drop policy if exists "' || r.policyname || '" on public.profiles'; end loop;
end $$;

create policy "own_profile_select" on profiles
  for select to authenticated using (auth.uid() = id);

create policy "admin_all_profiles" on profiles
  for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "own_profile_update" on profiles
  for update to authenticated using (auth.uid() = id);

-- ══════════════════════════════════════════════════════════════
-- RRPP_PROFILES
-- ══════════════════════════════════════════════════════════════
do $$ declare r record; begin
  for r in select policyname from pg_policies where tablename = 'rrpp_profiles' and schemaname = 'public'
  loop execute 'drop policy if exists "' || r.policyname || '" on public.rrpp_profiles'; end loop;
end $$;

-- Public (anon): solo puede leer por slug (para el form de registro)
create policy "public_read_active_rrpp" on rrpp_profiles
  for select using (active = true);

-- RRPP autenticado: lee su propio perfil
create policy "rrpp_own_select" on rrpp_profiles
  for select to authenticated using (profile_id = auth.uid());

-- Admin: gestión completa
create policy "admin_manage_rrpp_profiles" on rrpp_profiles
  for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- ══════════════════════════════════════════════════════════════
-- EVENTS
-- ══════════════════════════════════════════════════════════════
do $$ declare r record; begin
  for r in select policyname from pg_policies where tablename = 'events' and schemaname = 'public'
  loop execute 'drop policy if exists "' || r.policyname || '" on public.events'; end loop;
end $$;

-- Todo el staff autenticado puede leer eventos
create policy "authenticated_read_events" on events
  for select to authenticated using (true);

-- Público (anon): solo evento activo (para el form de registro)
create policy "anon_read_active_events" on events
  for select using (status = 'active');

-- Solo admin puede crear/modificar/cerrar eventos
create policy "admin_manage_events" on events
  for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- ══════════════════════════════════════════════════════════════
-- GUEST_REGISTRATIONS
-- ══════════════════════════════════════════════════════════════
do $$ declare r record; begin
  for r in select policyname from pg_policies where tablename = 'guest_registrations' and schemaname = 'public'
  loop execute 'drop policy if exists "' || r.policyname || '" on public.guest_registrations'; end loop;
end $$;

-- Anon/público: puede INSERT (registro de invitados sin login)
create policy "anon_insert_registrations" on guest_registrations
  for insert with check (true);

-- Admin y cajeros: ven todos los registros
create policy "admin_cashier_read_registrations" on guest_registrations
  for select to authenticated
  using (exists (
    select 1 from profiles where id = auth.uid() and role in ('admin', 'cashier')
  ));

-- RRPP: solo ve SUS propios registrados
create policy "rrpp_own_registrations" on guest_registrations
  for select to authenticated
  using (
    rrpp_id in (select id from rrpp_profiles where profile_id = auth.uid())
  );

-- Cajero y admin: pueden marcar como checked_in
create policy "cashier_update_registrations" on guest_registrations
  for update to authenticated
  using (exists (
    select 1 from profiles where id = auth.uid() and role in ('admin', 'cashier')
  ));

-- ══════════════════════════════════════════════════════════════
-- CHECKINS
-- ══════════════════════════════════════════════════════════════
do $$ declare r record; begin
  for r in select policyname from pg_policies where tablename = 'checkins' and schemaname = 'public'
  loop execute 'drop policy if exists "' || r.policyname || '" on public.checkins'; end loop;
end $$;

create policy "staff_read_checkins" on checkins
  for select to authenticated
  using (exists (
    select 1 from profiles where id = auth.uid() and role in ('admin', 'cashier')
  ));

create policy "cashier_insert_checkins" on checkins
  for insert to authenticated
  with check (exists (
    select 1 from profiles where id = auth.uid() and role in ('admin', 'cashier')
  ));

-- ══════════════════════════════════════════════════════════════
-- RRPP_EVENT_BENEFITS
-- ══════════════════════════════════════════════════════════════
do $$ declare r record; begin
  for r in select policyname from pg_policies where tablename = 'rrpp_event_benefits' and schemaname = 'public'
  loop execute 'drop policy if exists "' || r.policyname || '" on public.rrpp_event_benefits'; end loop;
end $$;

create policy "admin_bar_manage_benefits" on rrpp_event_benefits
  for all to authenticated
  using (exists (
    select 1 from profiles where id = auth.uid() and role in ('admin', 'bar')
  ))
  with check (exists (
    select 1 from profiles where id = auth.uid() and role in ('admin', 'bar')
  ));

create policy "rrpp_own_benefits" on rrpp_event_benefits
  for select to authenticated
  using (rrpp_id in (select id from rrpp_profiles where profile_id = auth.uid()));

-- ══════════════════════════════════════════════════════════════
-- RRPP_EVENT_REWARDS
-- ══════════════════════════════════════════════════════════════
do $$ declare r record; begin
  for r in select policyname from pg_policies where tablename = 'rrpp_event_rewards' and schemaname = 'public'
  loop execute 'drop policy if exists "' || r.policyname || '" on public.rrpp_event_rewards'; end loop;
end $$;

create policy "admin_bar_manage_rewards" on rrpp_event_rewards
  for all to authenticated
  using (exists (
    select 1 from profiles where id = auth.uid() and role in ('admin', 'bar')
  ))
  with check (exists (
    select 1 from profiles where id = auth.uid() and role in ('admin', 'bar')
  ));

create policy "rrpp_own_rewards" on rrpp_event_rewards
  for select to authenticated
  using (rrpp_id in (select id from rrpp_profiles where profile_id = auth.uid()));

-- ══════════════════════════════════════════════════════════════
-- GOLD_QRS
-- ══════════════════════════════════════════════════════════════
do $$ declare r record; begin
  for r in select policyname from pg_policies where tablename = 'gold_qrs' and schemaname = 'public'
  loop execute 'drop policy if exists "' || r.policyname || '" on public.gold_qrs'; end loop;
end $$;

create policy "public_read_gold_qrs" on gold_qrs
  for select using (true);

create policy "admin_cashier_manage_gold_qrs" on gold_qrs
  for all to authenticated
  using (exists (
    select 1 from profiles where id = auth.uid() and role in ('admin', 'cashier')
  ))
  with check (exists (
    select 1 from profiles where id = auth.uid() and role in ('admin', 'cashier')
  ));

-- ══════════════════════════════════════════════════════════════
-- PROMO_QRS
-- ══════════════════════════════════════════════════════════════
do $$ declare r record; begin
  for r in select policyname from pg_policies where tablename = 'promo_qrs' and schemaname = 'public'
  loop execute 'drop policy if exists "' || r.policyname || '" on public.promo_qrs'; end loop;
end $$;

create policy "public_read_active_promos" on promo_qrs
  for select using (status = 'active');

create policy "admin_bar_manage_promos" on promo_qrs
  for all to authenticated
  using (exists (
    select 1 from profiles where id = auth.uid() and role in ('admin', 'bar')
  ))
  with check (exists (
    select 1 from profiles where id = auth.uid() and role in ('admin', 'bar')
  ));

-- ══════════════════════════════════════════════════════════════
-- PROMO_REDEMPTIONS
-- ══════════════════════════════════════════════════════════════
do $$ declare r record; begin
  for r in select policyname from pg_policies where tablename = 'promo_redemptions' and schemaname = 'public'
  loop execute 'drop policy if exists "' || r.policyname || '" on public.promo_redemptions'; end loop;
end $$;

create policy "bar_admin_manage_redemptions" on promo_redemptions
  for all to authenticated
  using (exists (
    select 1 from profiles where id = auth.uid() and role in ('admin', 'bar')
  ))
  with check (exists (
    select 1 from profiles where id = auth.uid() and role in ('admin', 'bar')
  ));

-- ══════════════════════════════════════════════════════════════
-- VIEWS — grant acceso a usuarios autenticados
-- ══════════════════════════════════════════════════════════════
grant select on rrpp_ranking to authenticated, anon;
grant select on rrpp_monthly_ranking to authenticated;

-- ══════════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ══════════════════════════════════════════════════════════════
select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
