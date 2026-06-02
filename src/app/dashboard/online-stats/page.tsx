'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { toPng } from 'html-to-image'

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
  created_at?: string | null
}

type RrppStats = {
  rrpp_id: string
  name: string
  anotados: number
  ingresaron: number
  pendientes: number
  guests: Guest[]
}

const PAY_PER_ENTRY = 1000

export default function OnlineStatsPage() {
  const supabase = getSupabaseClient()

  const [events, setEvents] = useState<EventRow[]>([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [event, setEvent] = useState<EventRow | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [rrpps, setRrpps] = useState<Rrpp[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const exportRef = useRef<HTMLDivElement | null>(null)

  async function loadEvents(options?: { keepCurrent?: boolean }) {
    const { data, error } = await supabase
      .from('events')
      .select('id,name,status,is_active,event_date,created_at')
      .order('event_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error cargando eventos:', error)
      return
    }

    const eventList = (data || []) as EventRow[]
    setEvents(eventList)

    if (eventList.length === 0) {
      setSelectedEventId('')
      setEvent(null)
      setGuests([])
      return
    }

    const activeOrLatest =
      eventList.find((ev) => ev.is_active === true || ev.status === 'active') || eventList[0]

    setSelectedEventId((current) => {
      if (options?.keepCurrent && current) return current
      if (current && eventList.some((ev) => ev.id === current)) return current
      return activeOrLatest.id
    })
  }

  async function loadStatsForEvent(eventId: string) {
    if (!eventId) {
      setLoading(false)
      return
    }

    setLoading(true)

    const selectedEvent = events.find((ev) => ev.id === eventId) || null

    const [eventRes, guestRes, rrppRes] = await Promise.all([
      selectedEvent
        ? Promise.resolve({ data: selectedEvent, error: null })
        : supabase
            .from('events')
            .select('id,name,status,is_active,event_date,created_at')
            .eq('id', eventId)
            .maybeSingle(),

      supabase
        .from('guest_registrations')
        .select('id,event_id,rrpp_id,first_name,last_name,dni_last3,registration_status,created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true }),

      supabase
        .from('rrpp_profiles')
        .select('id,display_name,active')
        .order('display_name', { ascending: true }),
    ])

    if (eventRes.error) console.error('Error cargando evento:', eventRes.error)
    if (guestRes.error) console.error('Error cargando invitados:', guestRes.error)
    if (rrppRes.error) console.error('Error cargando RRPP:', rrppRes.error)

    setEvent((eventRes.data || selectedEvent) as EventRow | null)
    setGuests((guestRes.data || []) as Guest[])
    setRrpps((rrppRes.data || []) as Rrpp[])
    setLoading(false)
  }

  useEffect(() => {
    loadEvents()

    const interval = setInterval(() => {
      loadEvents({ keepCurrent: true })
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!selectedEventId) return

    loadStatsForEvent(selectedEventId)

    const interval = setInterval(() => {
      loadStatsForEvent(selectedEventId)
    }, 5000)

    return () => clearInterval(interval)
  }, [selectedEventId, events.length])

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

  const payoutStats = useMemo(() => {
    return stats
      .filter((item) => item.rrpp_id !== 'sin-rrpp' && item.ingresaron > 0)
      .map((item) => ({
        ...item,
        pago: item.ingresaron * PAY_PER_ENTRY,
      }))
  }, [stats])

  const totalAnotados = guests.length
  const totalIngresaron = guests.filter((g) => g.registration_status === 'checked_in').length
  const totalPendientes = totalAnotados - totalIngresaron
  const totalAPagar = payoutStats.reduce((acc, item) => acc + item.pago, 0)

  function formatGuest(g: Guest, index: number) {
    const name = `${g.first_name || ''} ${g.last_name || ''}`.trim() || 'Sin nombre'
    const dni = g.dni_last3 ? `DNI ${g.dni_last3}` : 'DNI ---'
    const status = g.registration_status === 'checked_in' ? 'INGRESÓ' : 'PENDIENTE'
    return `${index + 1}. ${name} - ${dni} - ${status}`
  }

  function formatDate(date?: string | null) {
    if (!date) return 'Sin fecha'
    const d = new Date(date)
    if (Number.isNaN(d.getTime())) return 'Sin fecha'

    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  async function copyList(item: RrppStats) {
    const text = [
      `LISTA ${item.name.toUpperCase()} - HOLY`,
      '',
      `EVENTO: ${event?.name || 'Evento'}`,
      `FECHA: ${formatDate(event?.event_date)}`,
      '',
      `ANOTADOS: ${item.anotados}`,
      `INGRESARON: ${item.ingresaron}`,
      `PENDIENTES: ${item.pendientes}`,
      `PAGO: $${(item.ingresaron * PAY_PER_ENTRY).toLocaleString('es-AR')}`,
      '',
      ...item.guests.map(formatGuest),
    ].join('\n')

    await navigator.clipboard.writeText(text)
    setCopied(item.rrpp_id)
    setTimeout(() => setCopied(null), 1800)
  }

  async function handleExportImage() {
    if (!exportRef.current || !event) return

    try {
      setExporting(true)

      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#09090b',
      })

      const link = document.createElement('a')
      const eventName = (event.name || 'evento').replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
      const eventDate = formatDate(event.event_date).replace(/\//g, '-')

      link.download = `liquidacion-${eventName}-${eventDate}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Error exportando imagen:', err)
      alert('No se pudo guardar la imagen.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="rounded-3xl border border-yellow-500/30 bg-zinc-950 p-5 shadow-[0_0_40px_rgba(234,179,8,0.12)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-yellow-400">HOLY CLUB</p>
              <h1 className="mt-2 text-3xl font-black">ONLINE STATS</h1>
              <p className="mt-1 text-sm text-zinc-400">
                {event ? event.name || 'Evento seleccionado' : 'Buscando evento...'} · actualización automática cada 5s
              </p>
            </div>

            <button
              onClick={handleExportImage}
              disabled={!event || exporting || payoutStats.length === 0}
              className="rounded-2xl bg-yellow-400 px-4 py-3 text-sm font-black text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
            >
              {exporting ? 'GENERANDO IMG...' : 'GUARDAR COMO IMG'}
            </button>
          </div>
        </div>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-400">
                Seleccionar evento
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                Por defecto toma el evento activo o el último. Podés elegir otro para revisar y exportar.
              </p>
            </div>

            <select
              value={selectedEventId}
              onChange={(e) => {
                setExpanded(null)
                setSelectedEventId(e.target.value)
              }}
              className="w-full rounded-2xl border border-yellow-500/30 bg-black px-4 py-3 text-sm font-black text-white outline-none focus:border-yellow-400 md:w-[360px]"
            >
              {events.length === 0 ? (
                <option value="">Sin eventos</option>
              ) : (
                events.map((ev) => (
                  <option key={ev.id} value={ev.id} className="bg-black text-white">
                    {(ev.is_active || ev.status === 'active') ? '🟢 ' : ''}
                    {ev.name || 'Evento sin nombre'} - {formatDate(ev.event_date)}
                  </option>
                ))
              )}
            </select>
          </div>
        </section>

        {loading && !event ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-400">
            Cargando estadísticas...
          </div>
        ) : !event ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-950/30 p-5 text-red-200">
            No encontré evento.
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Card title="Anotados" value={totalAnotados} />
              <Card title="Ingresaron" value={totalIngresaron} green />
              <Card title="Pendientes" value={totalPendientes} />
              <MoneyCard title="Total a pagar" value={totalAPagar} />
            </section>

            <section className="space-y-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-yellow-400">RRPP</h2>
                  <p className="text-sm text-zinc-400">
                    {event.name || 'Evento'} · {formatDate(event.event_date)} · ${PAY_PER_ENTRY.toLocaleString('es-AR')} por ingreso
                  </p>
                </div>

                <p className="text-sm font-bold text-emerald-400">
                  Total a pagar: ${totalAPagar.toLocaleString('es-AR')}
                </p>
              </div>

              {stats.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-400">
                  No hay invitados cargados para este evento.
                </div>
              ) : (
                stats.map((item, index) => {
                  const isOpen = expanded === item.rrpp_id
                  const pago = item.ingresaron * PAY_PER_ENTRY

                  return (
                    <div
                      key={item.rrpp_id}
                      className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950"
                    >
                      <button
                        onClick={() => setExpanded(isOpen ? null : item.rrpp_id)}
                        className="flex w-full items-center justify-between gap-3 p-4 text-left"
                      >
                        <div>
                          <p className="text-lg font-black">
                            {index + 1}. {item.name}
                          </p>
                          <p className="text-sm text-zinc-400">
                            {item.ingresaron} ingresados / {item.anotados} anotados
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <span className="rounded-full border border-emerald-500/40 px-3 py-1 text-xs font-bold text-emerald-300">
                            MONTO: ${pago.toLocaleString('es-AR')}
                          </span>

                          <span className="rounded-full border border-yellow-500/40 px-3 py-1 text-xs font-bold text-yellow-300">
                            {isOpen ? 'CERRAR' : 'EXPANDIR'}
                          </span>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="space-y-4 border-t border-zinc-800 p-4">
                          <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                            <Mini label="Anotados" value={item.anotados} />
                            <Mini label="Ingresaron" value={item.ingresaron} />
                            <Mini label="Pendientes" value={item.pendientes} />
                            <MiniMoney label="Pago" value={pago} />
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
                })
              )}
            </section>
          </>
        )}

        {/* BLOQUE SOLO PARA EXPORTAR COMO IMG */}
        {event ? (
          <div className="pointer-events-none fixed left-[-99999px] top-0">
            <div ref={exportRef} className="w-[1080px] bg-[#09090b] p-10 text-white">
              <div className="rounded-[28px] border border-yellow-500/30 bg-zinc-950 p-8 shadow-[0_0_40px_rgba(234,179,8,0.10)]">
                <p className="text-sm font-bold uppercase tracking-[0.35em] text-yellow-400">
                  HOLY CLUB
                </p>

                <h1 className="mt-3 text-4xl font-black">
                  {event.name || 'EVENTO'}
                </h1>

                <p className="mt-2 text-lg text-zinc-400">
                  {formatDate(event.event_date)} · ${PAY_PER_ENTRY.toLocaleString('es-AR')} por ingreso
                </p>

                <div className="mt-8 rounded-2xl border border-zinc-800 bg-black/30 px-5 py-4">
                  <div className="grid grid-cols-[1.6fr_0.7fr_0.8fr] gap-4 text-sm font-bold uppercase tracking-[0.18em] text-zinc-400">
                    <p>RRPP</p>
                    <p className="text-center">Ingresos</p>
                    <p className="text-right">Pago</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {payoutStats.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-800 bg-black/35 px-5 py-5 text-xl font-bold text-zinc-500">
                      Sin ingresos para liquidar.
                    </div>
                  ) : (
                    payoutStats.map((item) => (
                      <div key={item.rrpp_id} className="rounded-2xl border border-zinc-800 bg-black/35 px-5 py-4">
                        <div className="grid grid-cols-[1.6fr_0.7fr_0.8fr] items-center gap-4">
                          <p className="text-2xl font-black">{item.name}</p>
                          <p className="text-center text-2xl font-black text-white">
                            {item.ingresaron}
                          </p>
                          <p className="text-right text-2xl font-black text-emerald-400">
                            ${item.pago.toLocaleString('es-AR')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-8 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-6">
                  <p className="text-sm font-bold uppercase tracking-[0.28em] text-emerald-300">
                    TOTAL A PAGAR
                  </p>
                  <p className="mt-2 text-5xl font-black text-emerald-400">
                    ${totalAPagar.toLocaleString('es-AR')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
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

function MoneyCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-zinc-950 p-4 text-center">
      <p className="text-xs uppercase tracking-widest text-zinc-500">{title}</p>
      <p className="mt-2 text-3xl font-black text-emerald-400">
        ${value.toLocaleString('es-AR')}
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

function MiniMoney({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-black p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-xl font-black text-emerald-400">
        ${value.toLocaleString('es-AR')}
      </p>
    </div>
  )
}
