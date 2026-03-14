-- ============================================================
-- HOLY CLUB — SEED USUARIOS REALES (FIXED v3)
-- Ejecutar en Supabase SQL Editor DESPUÉS de 001_initial.sql
-- ============================================================
-- FIX: usa jsonb_build_object() en lugar de concatenación de strings
--      para evitar el error "invalid input syntax for type json"
-- ============================================================

create extension if not exists pgcrypto;

do $$
declare
  v_tomi_id      uuid := gen_random_uuid();
  v_franco_id    uuid := gen_random_uuid();
  v_claudia_id   uuid := gen_random_uuid();
  v_diego_id     uuid := gen_random_uuid();
  v_kiara_id     uuid := gen_random_uuid();
  v_agustin_id   uuid := gen_random_uuid();
  v_matias_id    uuid := gen_random_uuid();
  v_valentin_id  uuid := gen_random_uuid();
  v_anto_id      uuid := gen_random_uuid();
  v_camila_id    uuid := gen_random_uuid();
  v_julieta_id   uuid := gen_random_uuid();
  v_antonella_id uuid := gen_random_uuid();
  v_abril_id     uuid := gen_random_uuid();
  v_valen_id     uuid := gen_random_uuid();
  v_maar_id      uuid := gen_random_uuid();
  v_celina_id    uuid := gen_random_uuid();
  v_azul_id      uuid := gen_random_uuid();
  v_lucia_id     uuid := gen_random_uuid();
  v_josema_id    uuid := gen_random_uuid();
begin

  -- ══════════════════════════════════════════════════════════
  -- 1. AUTH USERS (todos en un insert para eficiencia)
  -- ══════════════════════════════════════════════════════════
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values
    -- ADMIN
    (v_tomi_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'n0thing@holyclub.com', crypt('ratona', gen_salt('bf')), now(),
     '{"full_name":"Tomi Mayer","role":"admin","username":"n0thing"}',
     now(), now(), '','','',''),
    -- CASHIERS
    (v_franco_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'franco@holyclub.com', crypt('123321', gen_salt('bf')), now(),
     '{"full_name":"Franco","role":"cashier","username":"franco"}',
     now(), now(), '','','',''),
    (v_claudia_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'claudia@holyclub.com', crypt('153624', gen_salt('bf')), now(),
     '{"full_name":"Claudia","role":"cashier","username":"claudia"}',
     now(), now(), '','','',''),
    (v_diego_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'diego@holyclub.com', crypt('salta442', gen_salt('bf')), now(),
     '{"full_name":"Diego","role":"cashier","username":"diego"}',
     now(), now(), '','','',''),
    -- RRPP
    (v_kiara_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'kiara@holyclub.com', crypt('holy-kiara21', gen_salt('bf')), now(),
     '{"full_name":"Kiara Lobos","role":"rrpp","username":"kiara"}',
     now(), now(), '','','',''),
    (v_agustin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'agustin@holyclub.com', crypt('holy-agustin22', gen_salt('bf')), now(),
     '{"full_name":"Agustin Bravo","role":"rrpp","username":"agustin"}',
     now(), now(), '','','',''),
    (v_matias_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'matias@holyclub.com', crypt('holy-matias23', gen_salt('bf')), now(),
     '{"full_name":"Matias Andermatten","role":"rrpp","username":"matias"}',
     now(), now(), '','','',''),
    (v_valentin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'valentin@holyclub.com', crypt('holy-valentin24', gen_salt('bf')), now(),
     '{"full_name":"Valentin Ortiz","role":"rrpp","username":"valentin"}',
     now(), now(), '','','',''),
    (v_anto_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'anto@holyclub.com', crypt('holy-anto25', gen_salt('bf')), now(),
     '{"full_name":"Anto Perez","role":"rrpp","username":"anto"}',
     now(), now(), '','','',''),
    (v_camila_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'camila@holyclub.com', crypt('holy-camila26', gen_salt('bf')), now(),
     '{"full_name":"Camila Gonet","role":"rrpp","username":"camila"}',
     now(), now(), '','','',''),
    (v_julieta_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'julieta@holyclub.com', crypt('holy-julieta27', gen_salt('bf')), now(),
     '{"full_name":"Julieta Moya","role":"rrpp","username":"julieta"}',
     now(), now(), '','','',''),
    (v_antonella_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'antonella@holyclub.com', crypt('holy-antonella28', gen_salt('bf')), now(),
     '{"full_name":"Antonella Duca","role":"rrpp","username":"antonella"}',
     now(), now(), '','','',''),
    (v_abril_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'abril@holyclub.com', crypt('holy-abril29', gen_salt('bf')), now(),
     '{"full_name":"Abril Haedo","role":"rrpp","username":"abril"}',
     now(), now(), '','','',''),
    (v_valen_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'valen@holyclub.com', crypt('holy-valen30', gen_salt('bf')), now(),
     '{"full_name":"Valen Flores","role":"rrpp","username":"valen"}',
     now(), now(), '','','',''),
    (v_maar_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'maar@holyclub.com', crypt('holy-maar31', gen_salt('bf')), now(),
     '{"full_name":"Maar Florespauli","role":"rrpp","username":"maar"}',
     now(), now(), '','','',''),
    (v_celina_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'celina@holyclub.com', crypt('holy-celina32', gen_salt('bf')), now(),
     '{"full_name":"Celina Yañez","role":"rrpp","username":"celina"}',
     now(), now(), '','','',''),
    (v_azul_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'azul@holyclub.com', crypt('holy-azul33', gen_salt('bf')), now(),
     '{"full_name":"Azul Bello","role":"rrpp","username":"azul"}',
     now(), now(), '','','',''),
    (v_lucia_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'lucia@holyclub.com', crypt('holy-lucia34', gen_salt('bf')), now(),
     '{"full_name":"Lucia Valdebenito","role":"rrpp","username":"lucia"}',
     now(), now(), '','','',''),
    (v_josema_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'josema@holyclub.com', crypt('holy-josema35', gen_salt('bf')), now(),
     '{"full_name":"Josema Gonzalez","role":"rrpp","username":"josema"}',
     now(), now(), '','','','');

  -- ══════════════════════════════════════════════════════════
  -- 2. AUTH IDENTITIES
  -- CLAVE DEL FIX: usar jsonb_build_object() en lugar de
  -- concatenar strings JSON manualmente. Un insert por usuario
  -- para que el planner no confunda los literales.
  -- ══════════════════════════════════════════════════════════

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_tomi_id, 'n0thing@holyclub.com',
    jsonb_build_object('sub', v_tomi_id::text, 'email', 'n0thing@holyclub.com'),
    'email', now(), now(), now());

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_franco_id, 'franco@holyclub.com',
    jsonb_build_object('sub', v_franco_id::text, 'email', 'franco@holyclub.com'),
    'email', now(), now(), now());

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_claudia_id, 'claudia@holyclub.com',
    jsonb_build_object('sub', v_claudia_id::text, 'email', 'claudia@holyclub.com'),
    'email', now(), now(), now());

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_diego_id, 'diego@holyclub.com',
    jsonb_build_object('sub', v_diego_id::text, 'email', 'diego@holyclub.com'),
    'email', now(), now(), now());

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_kiara_id, 'kiara@holyclub.com',
    jsonb_build_object('sub', v_kiara_id::text, 'email', 'kiara@holyclub.com'),
    'email', now(), now(), now());

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_agustin_id, 'agustin@holyclub.com',
    jsonb_build_object('sub', v_agustin_id::text, 'email', 'agustin@holyclub.com'),
    'email', now(), now(), now());

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_matias_id, 'matias@holyclub.com',
    jsonb_build_object('sub', v_matias_id::text, 'email', 'matias@holyclub.com'),
    'email', now(), now(), now());

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_valentin_id, 'valentin@holyclub.com',
    jsonb_build_object('sub', v_valentin_id::text, 'email', 'valentin@holyclub.com'),
    'email', now(), now(), now());

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_anto_id, 'anto@holyclub.com',
    jsonb_build_object('sub', v_anto_id::text, 'email', 'anto@holyclub.com'),
    'email', now(), now(), now());

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_camila_id, 'camila@holyclub.com',
    jsonb_build_object('sub', v_camila_id::text, 'email', 'camila@holyclub.com'),
    'email', now(), now(), now());

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_julieta_id, 'julieta@holyclub.com',
    jsonb_build_object('sub', v_julieta_id::text, 'email', 'julieta@holyclub.com'),
    'email', now(), now(), now());

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_antonella_id, 'antonella@holyclub.com',
    jsonb_build_object('sub', v_antonella_id::text, 'email', 'antonella@holyclub.com'),
    'email', now(), now(), now());

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_abril_id, 'abril@holyclub.com',
    jsonb_build_object('sub', v_abril_id::text, 'email', 'abril@holyclub.com'),
    'email', now(), now(), now());

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_valen_id, 'valen@holyclub.com',
    jsonb_build_object('sub', v_valen_id::text, 'email', 'valen@holyclub.com'),
    'email', now(), now(), now());

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_maar_id, 'maar@holyclub.com',
    jsonb_build_object('sub', v_maar_id::text, 'email', 'maar@holyclub.com'),
    'email', now(), now(), now());

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_celina_id, 'celina@holyclub.com',
    jsonb_build_object('sub', v_celina_id::text, 'email', 'celina@holyclub.com'),
    'email', now(), now(), now());

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_azul_id, 'azul@holyclub.com',
    jsonb_build_object('sub', v_azul_id::text, 'email', 'azul@holyclub.com'),
    'email', now(), now(), now());

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_lucia_id, 'lucia@holyclub.com',
    jsonb_build_object('sub', v_lucia_id::text, 'email', 'lucia@holyclub.com'),
    'email', now(), now(), now());

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_josema_id, 'josema@holyclub.com',
    jsonb_build_object('sub', v_josema_id::text, 'email', 'josema@holyclub.com'),
    'email', now(), now(), now());

  -- ══════════════════════════════════════════════════════════
  -- 3. RRPP PROFILES
  -- El trigger handle_new_user() ya insertó los rows en profiles.
  -- Acá solo creamos los rrpp_profiles con display_name y slug.
  -- ══════════════════════════════════════════════════════════
  insert into public.rrpp_profiles (profile_id, display_name, slug, active)
  values
    (v_kiara_id,     'Kiara Lobos',        'kiara',     true),
    (v_agustin_id,   'Agustin Bravo',      'agustin',   true),
    (v_matias_id,    'Matias Andermatten', 'matias',    true),
    (v_valentin_id,  'Valentin Ortiz',     'valentin',  true),
    (v_anto_id,      'Anto Perez',         'anto',      true),
    (v_camila_id,    'Camila Gonet',       'camila',    true),
    (v_julieta_id,   'Julieta Moya',       'julieta',   true),
    (v_antonella_id, 'Antonella Duca',     'antonella', true),
    (v_abril_id,     'Abril Haedo',        'abril',     true),
    (v_valen_id,     'Valen Flores',       'valen',     true),
    (v_maar_id,      'Maar Florespauli',   'maar',      true),
    (v_celina_id,    'Celina Yañez',       'celina',    true),
    (v_azul_id,      'Azul Bello',         'azul',      true),
    (v_lucia_id,     'Lucia Valdebenito',  'lucia',     true),
    (v_josema_id,    'Josema Gonzalez',    'josema',    true);

  raise notice '✅ Seed completado: 19 usuarios (1 admin + 3 cajeros + 15 RRPP)';

end $$;

-- ══════════════════════════════════════════════════════════
-- VERIFICACIÓN — debe mostrar 19 filas
-- ══════════════════════════════════════════════════════════
select
  p.email,
  p.full_name,
  p.role,
  coalesce(rp.slug, '—') as slug
from profiles p
left join rrpp_profiles rp on rp.profile_id = p.id
order by p.role, p.full_name;
