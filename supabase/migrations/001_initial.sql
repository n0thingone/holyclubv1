-- =============================================
-- HOLY CLUB - Database Schema
-- IDEMPOTENTE: se puede ejecutar múltiples veces sin error.
-- Usa CREATE TABLE IF NOT EXISTS y borra policies antes de crearlas.
-- =============================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =============================================
-- TABLAS
-- =============================================

create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text not null,
  role text not null check (role in ('admin', 'cashier', 'bar', 'rrpp')),
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists rrpp_profiles (
  id uuid default uuid_generate_v4() primary key,
  profile_id uuid references profiles(id) on delete cascade not null,
  display_name text not null,
  slug text unique not null,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists events (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  event_date date not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  registration_until timestamptz,
  qr_entry_until timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  closed_at timestamptz
);

create table if not exists guest_registrations (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references events(id) on delete cascade not null,
  rrpp_id uuid references rrpp_profiles(id) not null,
  first_name text not null,
  last_name text not null,
  dni_last3 text not null check (length(dni_last3) = 3),
  qr_token text unique not null,
  registration_status text not null default 'registered'
    check (registration_status in ('registered', 'checked_in', 'expired')),
  created_at timestamptz default now()
);

create table if not exists checkins (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references events(id) on delete cascade not null,
  registration_id uuid references guest_registrations(id),
  rrpp_id uuid references rrpp_profiles(id),
  checked_in_at timestamptz default now(),
  checked_in_by uuid references profiles(id),
  result text not null check (result in (
    'valid_entry','used_qr','expired_qr','invalid_qr','gold_entry'
  ))
);

create table if not exists rrpp_event_benefits (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references events(id) on delete cascade not null,
  rrpp_id uuid references rrpp_profiles(id) not null,
  benefit_type text not null,
  title text not null,
  status text not null default 'pending'
    check (status in ('pending','issued','redeemed')),
  issued_at timestamptz,
  redeemed_at timestamptz,
  redeemed_by uuid references profiles(id),
  unique(event_id, rrpp_id, benefit_type)
);

create table if not exists rrpp_event_rewards (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references events(id) on delete cascade not null,
  rrpp_id uuid references rrpp_profiles(id) not null,
  reward_type text not null,
  title text not null,
  trigger_count integer not null default 35,
  status text not null default 'locked'
    check (status in ('locked','unlocked','redeemed')),
  qr_token text unique,
  issued_at timestamptz,
  expires_at timestamptz,
  redeemed_at timestamptz,
  redeemed_by uuid references profiles(id)
);

create table if not exists gold_qrs (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references events(id) on delete cascade not null,
  title text not null,
  qr_token text unique not null,
  max_uses integer not null default 1,
  used_count integer not null default 0,
  valid_until timestamptz,
  created_by uuid references profiles(id),
  status text not null default 'active'
    check (status in ('active','exhausted','expired','cancelled')),
  created_at timestamptz default now()
);

create table if not exists promo_qrs (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  qr_token text unique not null,
  max_uses integer not null default 100,
  used_count integer not null default 0,
  valid_date date,
  valid_from timestamptz,
  valid_until timestamptz,
  status text not null default 'active'
    check (status in ('active','exhausted','expired','cancelled')),
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists promo_redemptions (
  id uuid default uuid_generate_v4() primary key,
  promo_id uuid references promo_qrs(id) on delete cascade not null,
  redeemed_at timestamptz default now(),
  redeemed_by uuid references profiles(id)
);

-- =============================================
-- ROW LEVEL SECURITY — habilitar en cada tabla
-- =============================================
alter table profiles           enable row level security;
alter table rrpp_profiles      enable row level security;
alter table events             enable row level security;
alter table guest_registrations enable row level security;
alter table checkins           enable row level security;
alter table rrpp_event_benefits enable row level security;
alter table rrpp_event_rewards  enable row level security;
alter table gold_qrs           enable row level security;
alter table promo_qrs          enable row level security;
alter table promo_redemptions  enable row level security;

-- =============================================
-- POLICIES — borrar todas primero (idempotente)
-- =============================================
do $$ declare r record; begin
  for r in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
    and tablename in (
      'profiles','rrpp_profiles','events','guest_registrations',
      'checkins','rrpp_event_benefits','rrpp_event_rewards',
      'gold_qrs','promo_qrs','promo_redemptions'
    )
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- ── profiles ─────────────────────────────────────────────────
create policy "profiles_own_select" on profiles
  for select to authenticated using (auth.uid() = id);

create policy "profiles_admin_all" on profiles
  for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "profiles_own_update" on profiles
  for update to authenticated using (auth.uid() = id);

-- ── rrpp_profiles ─────────────────────────────────────────────
create policy "rrpp_profiles_anon_select" on rrpp_profiles
  for select using (active = true);

create policy "rrpp_profiles_own_select" on rrpp_profiles
  for select to authenticated using (profile_id = auth.uid());

create policy "rrpp_profiles_admin_all" on rrpp_profiles
  for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- ── events ────────────────────────────────────────────────────
create policy "events_anon_active" on events
  for select using (status = 'active');

create policy "events_auth_select" on events
  for select to authenticated using (true);

create policy "events_admin_all" on events
  for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- ── guest_registrations ───────────────────────────────────────
create policy "registrations_anon_insert" on guest_registrations
  for insert with check (true);

create policy "registrations_admin_cashier_select" on guest_registrations
  for select to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','cashier')));

create policy "registrations_rrpp_own" on guest_registrations
  for select to authenticated
  using (rrpp_id in (select id from rrpp_profiles where profile_id = auth.uid()));

create policy "registrations_cashier_update" on guest_registrations
  for update to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','cashier')));

-- ── checkins ──────────────────────────────────────────────────
create policy "checkins_staff_select" on checkins
  for select to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','cashier')));

create policy "checkins_cashier_insert" on checkins
  for insert to authenticated
  with check (exists (select 1 from profiles where id = auth.uid() and role in ('admin','cashier')));

-- ── rrpp_event_benefits ───────────────────────────────────────
create policy "benefits_bar_admin" on rrpp_event_benefits
  for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','bar')))
  with check (exists (select 1 from profiles where id = auth.uid() and role in ('admin','bar')));

create policy "benefits_rrpp_own" on rrpp_event_benefits
  for select to authenticated
  using (rrpp_id in (select id from rrpp_profiles where profile_id = auth.uid()));

-- ── rrpp_event_rewards ────────────────────────────────────────
create policy "rewards_bar_admin" on rrpp_event_rewards
  for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','bar')))
  with check (exists (select 1 from profiles where id = auth.uid() and role in ('admin','bar')));

create policy "rewards_rrpp_own" on rrpp_event_rewards
  for select to authenticated
  using (rrpp_id in (select id from rrpp_profiles where profile_id = auth.uid()));

-- ── gold_qrs ──────────────────────────────────────────────────
create policy "gold_qrs_public_select" on gold_qrs
  for select using (true);

create policy "gold_qrs_admin_cashier" on gold_qrs
  for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','cashier')))
  with check (exists (select 1 from profiles where id = auth.uid() and role in ('admin','cashier')));

-- ── promo_qrs ─────────────────────────────────────────────────
create policy "promo_qrs_public_select" on promo_qrs
  for select using (status = 'active');

create policy "promo_qrs_admin_bar" on promo_qrs
  for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','bar')))
  with check (exists (select 1 from profiles where id = auth.uid() and role in ('admin','bar')));

-- ── promo_redemptions ─────────────────────────────────────────
create policy "redemptions_bar_admin" on promo_redemptions
  for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','bar')))
  with check (exists (select 1 from profiles where id = auth.uid() and role in ('admin','bar')));

-- =============================================
-- REALTIME
-- =============================================
do $$ begin
  begin alter publication supabase_realtime add table events; exception when others then null; end;
  begin alter publication supabase_realtime add table guest_registrations; exception when others then null; end;
  begin alter publication supabase_realtime add table checkins; exception when others then null; end;
  begin alter publication supabase_realtime add table rrpp_event_rewards; exception when others then null; end;
end $$;

-- =============================================
-- VIEWS
-- =============================================
create or replace view rrpp_ranking as
select
  rp.id as rrpp_id,
  rp.display_name,
  rp.slug,
  e.id as event_id,
  e.name as event_name,
  count(c.id) filter (where c.result = 'valid_entry') as checkin_count,
  rank() over (
    partition by e.id
    order by count(c.id) filter (where c.result = 'valid_entry') desc
  ) as position
from rrpp_profiles rp
cross join events e
left join guest_registrations gr on gr.rrpp_id = rp.id and gr.event_id = e.id
left join checkins c on c.registration_id = gr.id and c.event_id = e.id
where e.status = 'active'
group by rp.id, rp.display_name, rp.slug, e.id, e.name;

create or replace view rrpp_monthly_ranking as
select
  rp.id as rrpp_id,
  rp.display_name,
  date_trunc('month', c.checked_in_at) as month,
  count(c.id) filter (where c.result = 'valid_entry') as monthly_checkins,
  rank() over (
    partition by date_trunc('month', c.checked_in_at)
    order by count(c.id) filter (where c.result = 'valid_entry') desc
  ) as position
from rrpp_profiles rp
left join guest_registrations gr on gr.rrpp_id = rp.id
left join checkins c on c.registration_id = gr.id and c.result = 'valid_entry'
group by rp.id, rp.display_name, date_trunc('month', c.checked_in_at);

grant select on rrpp_ranking to authenticated, anon;
grant select on rrpp_monthly_ranking to authenticated;

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'rrpp')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Auto-unlock reward when trigger_count is reached
create or replace function check_rewards_after_checkin()
returns trigger as $$
declare
  v_rrpp_id uuid;
  v_checkin_count integer;
  v_reward record;
begin
  if new.result != 'valid_entry' then return new; end if;

  select rrpp_id into v_rrpp_id
  from guest_registrations where id = new.registration_id;

  if v_rrpp_id is null then return new; end if;

  select count(*) into v_checkin_count
  from checkins c
  join guest_registrations gr on gr.id = c.registration_id
  where gr.rrpp_id = v_rrpp_id
    and c.event_id = new.event_id
    and c.result = 'valid_entry';

  for v_reward in
    select * from rrpp_event_rewards
    where event_id = new.event_id
      and rrpp_id = v_rrpp_id
      and status = 'locked'
      and trigger_count <= v_checkin_count
  loop
    update rrpp_event_rewards set
      status = 'unlocked',
      qr_token = gen_random_uuid()::text,
      issued_at = now(),
      expires_at = now() + interval '24 hours'
    where id = v_reward.id;
  end loop;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists after_checkin_check_rewards on checkins;
create trigger after_checkin_check_rewards
  after insert on checkins
  for each row execute procedure check_rewards_after_checkin();

-- =============================================
-- VERIFICACIÓN FINAL
-- =============================================
select 'Tablas creadas: ' || count(*)::text as resultado
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles','rrpp_profiles','events','guest_registrations',
    'checkins','rrpp_event_benefits','rrpp_event_rewards',
    'gold_qrs','promo_qrs','promo_redemptions'
  );
