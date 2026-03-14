-- ============================================================
-- HOLY CLUB — Reset contraseñas de todos los usuarios
-- Ejecutar en Supabase SQL Editor si el login falla
-- ============================================================

update auth.users set encrypted_password = crypt('ratona',      gen_salt('bf')) where email = 'n0thing@holyclub.com';
update auth.users set encrypted_password = crypt('123321',      gen_salt('bf')) where email = 'franco@holyclub.com';
update auth.users set encrypted_password = crypt('153624',      gen_salt('bf')) where email = 'claudia@holyclub.com';
update auth.users set encrypted_password = crypt('salta442',    gen_salt('bf')) where email = 'diego@holyclub.com';
update auth.users set encrypted_password = crypt('holy-kiara21',     gen_salt('bf')) where email = 'kiara@holyclub.com';
update auth.users set encrypted_password = crypt('holy-agustin22',   gen_salt('bf')) where email = 'agustin@holyclub.com';
update auth.users set encrypted_password = crypt('holy-matias23',    gen_salt('bf')) where email = 'matias@holyclub.com';
update auth.users set encrypted_password = crypt('holy-valentin24',  gen_salt('bf')) where email = 'valentin@holyclub.com';
update auth.users set encrypted_password = crypt('holy-anto25',      gen_salt('bf')) where email = 'anto@holyclub.com';
update auth.users set encrypted_password = crypt('holy-camila26',    gen_salt('bf')) where email = 'camila@holyclub.com';
update auth.users set encrypted_password = crypt('holy-julieta27',   gen_salt('bf')) where email = 'julieta@holyclub.com';
update auth.users set encrypted_password = crypt('holy-antonella28', gen_salt('bf')) where email = 'antonella@holyclub.com';
update auth.users set encrypted_password = crypt('holy-abril29',     gen_salt('bf')) where email = 'abril@holyclub.com';
update auth.users set encrypted_password = crypt('holy-valen30',     gen_salt('bf')) where email = 'valen@holyclub.com';
update auth.users set encrypted_password = crypt('holy-maar31',      gen_salt('bf')) where email = 'maar@holyclub.com';
update auth.users set encrypted_password = crypt('holy-celina32',    gen_salt('bf')) where email = 'celina@holyclub.com';
update auth.users set encrypted_password = crypt('holy-azul33',      gen_salt('bf')) where email = 'azul@holyclub.com';
update auth.users set encrypted_password = crypt('holy-lucia34',     gen_salt('bf')) where email = 'lucia@holyclub.com';
update auth.users set encrypted_password = crypt('holy-josema35',    gen_salt('bf')) where email = 'josema@holyclub.com';

-- Verificar
select email, 
  case when encrypted_password is not null then '✅ tiene contraseña' else '❌ sin contraseña' end as estado
from auth.users 
where email like '%holyclub.com'
order by email;
