'use client'

import { useEffect, useMemo, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'

type Guest = {
  id: string
  event_id: string
  rrpp_id: string | null
  first_name: string | null
  last_name: string | null
  dni_last3: string | null
  registration_status: string | null
  created_at: string
}

type Rrpp = {
  id: string
  display_name: string | null
  active: boolean | null
}

type EventRow = {
  id: string
  name: string | null
  status?: string | null
  is_active?: boolean | null
  event_date?: string | null
}

type RrppStats = {
  rrpp_id: string
  name: string
  anotados: number
  ingresaron: number
  pendientes: number
  guests: Guest[]
}

export default function OnlineStatsPage() {
 const supabase = getSupabaseClient()

  const [event, setEvent] = useState<EventRow | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [rrpps, setRrpps] = useState<Rrpp[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)

    let activeEvent: EventRow | null = null

    const q1 = await supabase
      .from('events')
      .select('id,name,status,is_active,event_date')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (q1.data) activeEvent = q1.data as EventRow

    if (!activeEvent) {
      const q2 = await supabase
        .from('events')
        .select('id,name,status,event_date')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (q2.data) activeEvent = q2.data as EventRow
    }

    if (!activeEvent) {
      const q3 = await supabase
        .from('events')
        .select('id,name,status,event_date')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (q3.data) activeEvent = q3.data as EventRow
    }

    if (!activeEvent) {
      setEvent(null)
      setGuests([])
      setRrpps([])
      setLoading(false)
      return
    }

    setEvent(activeEvent)

    const [guestRes, rrppRes] = await Promise.all([
      supabase
        .from('guest_registrations')
        .select('id,event_id,rrpp_id,first_name,last_name,dni_last3,registration_status,created_at')
        .eq('event_id', activeEvent.id)
        .order('created_at', { ascending: true }),

      supabase
        .from('rrpp_profiles')
        .select('id,display_name,active')
        .order('display_name', { ascending: true }),
    ])

    setGuests((guestRes.data || []) as Guest[])
    setRrpps((rrppRes.data || []) as Rrpp[])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  const stats = useMemo(() => {
    const rrppMap = new Map<string, Rrpp>()
    rrpps.forEach((r) => rrppMap.set(r.id, r))

    const grouped = new Map<string, RrppStats>()

    guests.forEach((g) => {
      const key = g.rrpp_id || 'sin-rrpp'
      const rrpp = g.rrpp_id ? rrppMap.get(g.rrpp_id) : null
      const name = rrpp?.display_name || 'Sin RRPP'

      if (!grouped.has(key)) {
        grouped.set(key, {
          rrpp_id: key,
          name,
          anotados: 0,
          ingresaron: 0,
          pendientes: 0,
          guests: [],
        })
      }

      const item = grouped.get(key)!
      item.anotados += 1
      item.guests.push(g)

      if (g.registration_status === 'checked_in') {
        item.ingresaron += 1
      } else {
        item.pendientes += 1
      }
    })

    return Array.from(grouped.values()).sort((a, b) => b.ingresaron - a.ingresaron)
  }, [guests, rrpps])

  const totalAnotados = guests.length
  const totalIngresaron = guests.filter((g) => g.registration_status === 'checked_in').length
  const totalPendientes = totalAnotados - totalIngresaron

  function formatGuest(g: Guest, index: number) {
    const name = `${g.first_name || ''} ${g.last_name || ''}`.trim() || 'Sin nombre'
    const dni = g.dni_last3 ? `DNI ${g.dni_last3}` : 'DNI ---'
    const status = g.registration_status === 'checked_in' ? 'INGRESÓ' : 'PENDIENTE'
    return `${index + 1}. ${name} - ${dni} - ${status}`
  }

  async function copyList(item: RrppStats) {
    const text = [
      `LISTA ${item.name.toUpperCase()} - HOLY`,
      '',
      `ANOTADOS: ${item.anotados}`,
      `INGRESARON: ${item.ingresaron}`,
      `PENDIENTES: ${item.pendientes}`,
      '',
      ...item.guests.map(formatGuest),
    ].join('\n')

    await navigator.clipboard.writeText(text)
    setCopied(item.rrpp_id)
    setTimeout(() => setCopied(null), 1800)
  }

  return (
    <main className="min-h-screen bg-black text-white px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="rounded-3xl border border-yellow-500/30 bg-zinc-950 p-5 shadow-[0_0_40px_rgba(234,179,8,0.12)]">
          <p className="text-xs uppercase tracking-[0.3em] text-yellow-400">HOLY CLUB</p>
          <h1 className="mt-2 text-3xl font-black">ONLINE STATS</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {event ? event.name || 'Evento activo' : 'Buscando evento...'} · actualización automática cada 5s
          </p>
        </div>

        {loading && !event ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-400">
            Cargando estadísticas...
          </div>
        ) : !event ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-950/30 p-5 text-red-200">
            No encontré evento activo.
          </div>
        ) : (
          <>
            <section className="grid grid-cols-3 gap-3">
              <Card title="Anotados" value={totalAnotados} />
              <Card title="Ingresaron" value={totalIngresaron} green />
              <Card title="Pendientes" value={totalPendientes} />
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-black text-yellow-400">Ranking RRPP</h2>

              {stats.map((item, index) => {
                const isOpen = expanded === item.rrpp_id

                return (
                  <div
                    key={item.rrpp_id}
                    className="rounded-3xl border border-zinc-800 bg-zinc-950 overflow-hidden"
                  >
                    <button
                      onClick={() => setExpanded(isOpen ? null : item.rrpp_id)}
                      className="w-full p-4 text-left flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-lg font-black">
                          {index + 1}. {item.name}
                        </p>
                        <p className="text-sm text-zinc-400">
                          {item.ingresaron} ingresados / {item.anotados} anotados
                        </p>
                      </div>

                      <span className="rounded-full border border-yellow-500/40 px-3 py-1 text-xs font-bold text-yellow-300">
                        {isOpen ? 'CERRAR' : 'EXPANDIR'}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="border-t border-zinc-800 p-4 space-y-4">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <Mini label="Anotados" value={item.anotados} />
                          <Mini label="Ingresaron" value={item.ingresaron} />
                          <Mini label="Pendientes" value={item.pendientes} />
                        </div>

                        <button
                          onClick={() => copyList(item)}
                          className="w-full rounded-2xl bg-yellow-400 px-4 py-3 font-black text-black"
                        >
                          {copied === item.rrpp_id ? 'COPIADO ✅' : 'COPIAR LISTA'}
                        </button>

                        <div className="max-h-[420px] overflow-auto rounded-2xl border border-zinc-800">
                          {item.guests.map((g, i) => (
                            <div
                              key={g.id}
                              className="flex items-center justify-between gap-3 border-b border-zinc-900 px-3 py-2 text-sm last:border-b-0"
                            >
                              <div>
                                <p className="font-bold">
                                  {i + 1}. {`${g.first_name || ''} ${g.last_name || ''}`.trim() || 'Sin nombre'}
                                </p>
                                <p className="text-xs text-zinc-500">DNI {g.dni_last3 || '---'}</p>
                              </div>

                              <span
                                className={
                                  g.registration_status === 'checked_in'
                                    ? 'rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-300'
                                    : 'rounded-full bg-zinc-800 px-2 py-1 text-xs font-bold text-zinc-300'
                                }
                              >
                                {g.registration_status === 'checked_in' ? 'INGRESÓ' : 'PENDIENTE'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </section>
          </>
        )}
      </div>
    </main>
  )
}

function Card({ title, value, green = false }: { title: string; value: number; green?: boolean }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-center">
      <p className="text-xs uppercase tracking-widest text-zinc-500">{title}</p>
      <p className={green ? 'mt-2 text-3xl font-black text-emerald-400' : 'mt-2 text-3xl font-black text-white'}>
        {value}
      </p>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-black p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-xl font-black">{value}</p>
    </div>
  )
}