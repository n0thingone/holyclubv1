# 🎉 HOLY CLUB — Sistema de Gestión

App completa para gestión de eventos nocturnos. Desarrollada con Next.js 14, TypeScript, TailwindCSS y Supabase.

## Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS, Lucide icons
- **Backend**: Supabase (Auth, Postgres, Realtime)
- **QR**: qrcode.react (generación), html5-qrcode (escaneo)
- **Deploy**: Vercel / Netlify

---

## Setup Rápido

### 1. Clonar e instalar

```bash
git clone <repo>
cd holy-club
npm install
```

### 2. Configurar Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ir a **SQL Editor** y ejecutar el contenido de `supabase/migrations/001_initial.sql`
3. Copiar tus credenciales desde **Settings → API**

### 3. Variables de entorno

```bash
cp .env.local.example .env.local
```

Editar `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Crear usuario admin

En el SQL Editor de Supabase:

```sql
-- 1. Crear usuario en auth (desde Dashboard → Authentication → Users → Invite)
-- Email: admin@holyclub.com / Password: tu-password

-- 2. Luego actualizar su rol:
UPDATE profiles SET role = 'admin' WHERE email = 'admin@holyclub.com';
```

O crear desde Authentication en Supabase Dashboard y luego actualizar el rol.

### 5. Correr en desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

---

## Roles del Sistema

| Rol | Acceso |
|-----|--------|
| `admin` | Dashboard completo, crear eventos, QRs, gestión |
| `cashier` | Escáner de entrada (taquilla) |
| `bar` | Escáner de premios y promos |
| `rrpp` | Panel personal con link, estadísticas, premios |

---

## Páginas

| URL | Descripción |
|-----|-------------|
| `/login` | Login para staff |
| `/dashboard` | Panel admin |
| `/dashboard/scanner` | Taquilla — escaneo de QRs |
| `/dashboard/bar` | Barra — canje de premios |
| `/dashboard/ranking` | Ranking en tiempo real |
| `/rrpp` | Panel RRPP personal |
| `/lista/[slug]` | Formulario de registro para invitados |

---

## Flujo Completo

1. **Admin** crea evento activo con horarios
2. **RRPP** comparte su link `/lista/camila`
3. **Invitado** entra al link, se registra, recibe QR
4. **Cajero** escanea QR en la puerta:
   - ✅ Verde: ENTRA FREE (suma al RRPP)
   - 🟡 Amarillo: QR vencido (horario finalizado)
   - ❌ Rojo: QR inválido o ya usado
5. **Admin** ve ranking en tiempo real
6. **RRPP** con 35+ ingresos desbloquea premio (botella)
7. **Barra** escanea QR de premio o promo para canjear

---

## Estructura de Carpetas

```
src/
├── app/
│   ├── dashboard/           # Panel admin/staff
│   │   ├── scanner/         # Taquilla
│   │   ├── bar/             # Barra
│   │   ├── ranking/         # Ranking
│   │   └── rrpp-panel/      # Gestión RRPP
│   ├── lista/[slug]/        # Registro invitados
│   ├── rrpp/                # Panel RRPP
│   └── login/               # Autenticación
├── components/
│   ├── scanner/             # QRScanner component
│   └── ui/                  # Toaster, etc.
├── hooks/                   # useActiveEvent, useRanking, useAuth, useRrppStats
├── lib/
│   ├── supabase/            # Client + Server clients
│   └── utils.ts             # Helpers
└── types/                   # TypeScript types
```

---

## Configuración Supabase Realtime

Las siguientes tablas tienen Realtime activado automáticamente por la migración:
- `events`
- `guest_registrations`
- `checkins`
- `rrpp_event_rewards`

---

## Deploy en Vercel

```bash
npm install -g vercel
vercel
```

Configurar las variables de entorno en el dashboard de Vercel.

---

## QR Codes

- **Generación**: `qrcode.react` → Los QR se generan en el cliente con tokens UUID únicos
- **Escaneo**: `html5-qrcode` → Accede a la cámara trasera del dispositivo
- **Tokens**: Formato `HC-XXXXXXXXXXXXXXXXX` (UUID sin guiones)

---

## Personalización

Los colores del tema están en `tailwind.config.ts`:

```ts
colors: {
  background: "#0b0716",
  card: "#1c1030",
  "accent-purple": "#be71ff",
  "accent-pink": "#dc8cff",
  // ...
}
```

El umbral de la botella (35 ingresos por defecto) se configura en `rrpp_event_rewards.trigger_count` al crear el evento.
