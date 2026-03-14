-- ============================================================
-- HOLY CLUB — Migration 005: Event Snapshots
-- Usa gen_random_uuid() nativo de Postgres 13+
-- RLS habilitado con policies correctas
-- event_id es UNIQUE: un solo snapshot por evento
-- ============================================================

-- Tabla de snapshots de noches cerradas
-- Un snapshot por evento (event_id unique) — representa el cierre definitivo
create table if not exists event_snapshots (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid references events(id) on delete cascade not null unique,
  event_name      text not null,
  event_date      date not null,
  closed_at       timestamptz not null,
  total_guests    integer not null default 0,
  total_checkins  integer not null default 0,
  total_gold      integer not null default 0,
  total_rrpp_active integer not null default 0,
  ranking_json    jsonb not null default '[]',
  top3_json       jsonb not null default '[]',
  summary_json    jsonb not null default '{}',
  created_at      timestamptz default now()
);

-- Agregar closed_at a events si no existe
alter table events add column if not exists closed_at timestamptz;

-- ── RLS ──────────────────────────────────────────────────────
-- No se desactiva RLS. Se definen policies correctas:
-- - Solo admin puede insertar/actualizar snapshots
-- - Admin y cashier pueden leer (para dashboard)
-- - Anon NO puede leer (datos internos sensibles)

alter table event_snapshots enable row level security;

drop policy if exists "snapshots_admin_write" on event_snapshots;
drop policy if exists "snapshots_staff_read"  on event_snapshots;

-- Admin puede crear y actualizar snapshots
create policy "snapshots_admin_write" on event_snapshots
  for all to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Admin, cashier y bar pueden leer el historial
create policy "snapshots_staff_read" on event_snapshots
  for select to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'cashier', 'bar'))
  );

-- Verificar
select 'event_snapshots ok — RLS habilitado con policies correctas' as status;
