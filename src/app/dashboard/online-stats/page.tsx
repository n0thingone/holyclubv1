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

type TicketBatch = {
  id: string
  event_id: string
  name: string
  batch_order: number
  price: number
  rrpp_commission: number
  stock: number | null
  sold_count: number
  active: boolean
  created_at: string
}

type TicketRow = {
  id: string
  order_id: string
  event_id: string
  batch_id: string
  source: string
  rrpp_id: string | null
  buyer_user_id: string | null
  buyer_first_name: string
  buyer_last_name: string
  buyer_dni: string | null
  buyer_phone: string | null
  buyer_email: string | null
  ticket_code: string
  public_token: string
  qr_token: string
  price: number
  rrpp_commission: number
  payment_status: string
  status: string
  entry_used_at: string | null
  entry_used_by: string | null
  created_at: string
}

type ManualTicketForm = {
  batch_id: string
  source: 'holy' | 'rrpp'
  rrpp_id: string
  buyer_first_name: string
  buyer_last_name: string
  buyer_dni: string
  buyer_phone: string
  buyer_email: string
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
  const [ticketBatches, setTicketBatches] = useState<TicketBatch[]>([])
  const [tickets, setTickets] = useState<TicketRow[]>([])
  const [ticketSearch, setTicketSearch] = useState('')
  const [ticketMessage, setTicketMessage] = useState('')
  const [ticketError, setTicketError] = useState('')
  const [creatingTicket, setCreatingTicket] = useState(false)
  const [showManualTicketForm, setShowManualTicketForm] = useState(false)
  const [selectedTicketForQr, setSelectedTicketForQr] = useState<TicketRow | null>(null)
  const [manualTicketForm, setManualTicketForm] = useState<ManualTicketForm>({
    batch_id: '',
    source: 'holy',
    rrpp_id: '',
    buyer_first_name: '',
    buyer_last_name: '',
    buyer_dni: '',
    buyer_phone: '',
    buyer_email: '',
  })
  const [activeTab, setActiveTab] = useState<'free' | 'anticipadas'>('free')
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
      setTicketBatches([])
      setTickets([])
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

    const [eventRes, guestRes, rrppRes, batchRes, ticketRes] = await Promise.all([
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

      supabase
        .from('ticket_batches')
        .select('id,event_id,name,batch_order,price,rrpp_commission,stock,sold_count,active,created_at')
        .eq('event_id', eventId)
        .order('batch_order', { ascending: true }),

      supabase
        .from('tickets')
        .select('id,order_id,event_id,batch_id,source,rrpp_id,buyer_user_id,buyer_first_name,buyer_last_name,buyer_dni,buyer_phone,buyer_email,ticket_code,public_token,qr_token,price,rrpp_commission,payment_status,status,entry_used_at,entry_used_by,created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false }),
    ])

    if (eventRes.error) console.error('Error cargando evento:', eventRes.error)
    if (guestRes.error) console.error('Error cargando invitados:', guestRes.error)
    if (rrppRes.error) console.error('Error cargando RRPP:', rrppRes.error)
    if (batchRes.error) console.error('Error cargando tandas:', batchRes.error)
    if (ticketRes.error) console.error('Error cargando tickets:', ticketRes.error)

    setEvent((eventRes.data || selectedEvent) as EventRow | null)
    setGuests((guestRes.data || []) as Guest[])
    setRrpps((rrppRes.data || []) as Rrpp[])
    const loadedBatches = (batchRes.data || []) as TicketBatch[]
    setTicketBatches(loadedBatches)
    setTickets((ticketRes.data || []) as TicketRow[])
    setManualTicketForm((prev) => ({
      ...prev,
      batch_id: prev.batch_id && loadedBatches.some((batch) => batch.id === prev.batch_id)
        ? prev.batch_id
        : loadedBatches[0]?.id || '',
    }))
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

  const batchById = useMemo(() => {
    const map = new Map<string, TicketBatch>()
    ticketBatches.forEach((batch) => map.set(batch.id, batch))
    return map
  }, [ticketBatches])

  const rrppById = useMemo(() => {
    const map = new Map<string, Rrpp>()
    rrpps.forEach((rrpp) => map.set(rrpp.id, rrpp))
    return map
  }, [rrpps])

  const ticketSummary = useMemo(() => {
    return tickets.reduce(
      (acc, ticket) => {
        if (ticket.payment_status !== 'paid') return acc

        acc.totalSold += 1
        acc.totalGross += ticket.price || 0
        acc.totalCommissions += ticket.rrpp_commission || 0
        acc.totalNet += (ticket.price || 0) - (ticket.rrpp_commission || 0)

        if (ticket.entry_used_at) {
          acc.totalUsed += 1
        } else {
          acc.totalPendingEntry += 1
        }

        return acc
      },
      {
        totalSold: 0,
        totalGross: 0,
        totalCommissions: 0,
        totalNet: 0,
        totalUsed: 0,
        totalPendingEntry: 0,
      }
    )
  }, [tickets])

  const filteredTickets = useMemo(() => {
    const search = ticketSearch.trim().toLowerCase()

    if (!search) return tickets

    return tickets.filter((ticket) => {
      const rrppName = ticket.rrpp_id ? rrppById.get(ticket.rrpp_id)?.display_name || '' : 'holy'
      const batchName = batchById.get(ticket.batch_id)?.name || ''

      return [
        ticket.buyer_first_name,
        ticket.buyer_last_name,
        ticket.buyer_dni || '',
        ticket.buyer_phone || '',
        ticket.buyer_email || '',
        ticket.ticket_code,
        rrppName,
        batchName,
      ]
        .join(' ')
        .toLowerCase()
        .includes(search)
    })
  }, [tickets, ticketSearch, rrppById, batchById])

  const batchSales = useMemo(() => {
    const map = new Map<string, { sold: number; used: number; pending: number; gross: number; commissions: number }>()

    ticketBatches.forEach((batch) => {
      map.set(batch.id, { sold: 0, used: 0, pending: 0, gross: 0, commissions: 0 })
    })

    tickets.forEach((ticket) => {
      if (ticket.payment_status !== 'paid') return
      const current = map.get(ticket.batch_id) || { sold: 0, used: 0, pending: 0, gross: 0, commissions: 0 }
      current.sold += 1
      if (ticket.entry_used_at) {
        current.used += 1
      } else {
        current.pending += 1
      }
      current.gross += ticket.price || 0
      current.commissions += ticket.rrpp_commission || 0
      map.set(ticket.batch_id, current)
    })

    return map
  }, [ticketBatches, tickets])

  function createCode(prefix: string) {
    const cryptoObj = typeof crypto !== 'undefined' ? crypto : null
    const raw = cryptoObj?.randomUUID ? cryptoObj.randomUUID() : `${Date.now()}-${Math.random()}`
    return `${prefix}_${raw.replace(/-/g, '').slice(0, 10).toUpperCase()}`
  }

  function getPrivateTicketLink(ticket: TicketRow) {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}/ticket/${ticket.public_token}`
  }

  async function copyPrivateTicketLink(ticket: TicketRow) {
    await navigator.clipboard.writeText(getPrivateTicketLink(ticket))
    setCopied(ticket.id)
    setTimeout(() => setCopied(null), 1800)
  }

  async function createManualTicket() {
    setTicketMessage('')
    setTicketError('')

    if (!event || !selectedEventId) {
      setTicketError('No hay evento seleccionado.')
      return
    }

    const batch = ticketBatches.find((item) => item.id === manualTicketForm.batch_id)

    if (!batch) {
      setTicketError('Elegí una tanda válida.')
      return
    }

    const firstName = manualTicketForm.buyer_first_name.trim()
    const lastName = manualTicketForm.buyer_last_name.trim()
    const dni = manualTicketForm.buyer_dni.trim()
    const phone = manualTicketForm.buyer_phone.trim()
    const email = manualTicketForm.buyer_email.trim()
    const selectedRrppId = manualTicketForm.source === 'rrpp' ? manualTicketForm.rrpp_id : ''

    if (!firstName || !lastName) {
      setTicketError('Nombre y apellido son obligatorios.')
      return
    }

    if (!dni && !phone) {
      setTicketError('Poné DNI o WhatsApp para poder recuperar la entrada.')
      return
    }

    if (manualTicketForm.source === 'rrpp' && !selectedRrppId) {
      setTicketError('Elegí el RRPP vendedor.')
      return
    }

    const soldForBatch = batchSales.get(batch.id)?.sold || 0

    if (typeof batch.stock === 'number' && soldForBatch >= batch.stock) {
      setTicketError('Esta tanda ya está agotada.')
      return
    }

    setCreatingTicket(true)

    const source = manualTicketForm.source
    const rrppId = source === 'rrpp' ? selectedRrppId : null
    const rrppCommission = rrppId ? batch.rrpp_commission : 0
    const ticketCode = createCode('TK')
    const publicToken = createCode('PUB')
    const qrToken = createCode('HOLY_TICKET')

    const orderPayload = {
      event_id: selectedEventId,
      batch_id: batch.id,
      source,
      rrpp_id: rrppId,
      buyer_first_name: firstName,
      buyer_last_name: lastName,
      buyer_dni: dni || null,
      buyer_phone: phone || null,
      buyer_email: email || null,
      quantity: 1,
      unit_price: batch.price,
      total_amount: batch.price,
      payment_method: 'manual',
      payment_status: 'paid',
      status: 'paid',
      approved_at: new Date().toISOString(),
    }

const { data: orderData, error: orderError } = await (supabase as any)
  .from('ticket_orders')
  .insert(orderPayload)
  .select('id')
  .single()

    if (orderError || !orderData) {
      setTicketError(orderError?.message || 'No se pudo crear la orden.')
      setCreatingTicket(false)
      return
    }

    const ticketPayload = {
      order_id: orderData.id,
      event_id: selectedEventId,
      batch_id: batch.id,
      source,
      rrpp_id: rrppId,
      buyer_first_name: firstName,
      buyer_last_name: lastName,
      buyer_dni: dni || null,
      buyer_phone: phone || null,
      buyer_email: email || null,
      ticket_code: ticketCode,
      public_token: publicToken,
      qr_token: qrToken,
      price: batch.price,
      rrpp_commission: rrppCommission,
      payment_status: 'paid',
      status: 'valid',
    }

    const { data: ticketData, error: ticketErrorInsert } = await (supabase as any)
      .from('tickets')
      .insert(ticketPayload)
      .select('id')
      .single()

    if (ticketErrorInsert || !ticketData) {
      setTicketError(ticketErrorInsert?.message || 'Se creó la orden, pero no se pudo crear la entrada.')
      setCreatingTicket(false)
      return
    }

    if (rrppId && rrppCommission > 0) {
      const { error: commissionError } = await (supabase as any).from('ticket_commissions').insert({
        ticket_id: ticketData.id,
        order_id: orderData.id,
        event_id: selectedEventId,
        batch_id: batch.id,
        rrpp_id: rrppId,
        amount: rrppCommission,
        status: 'pending',
      })

      if (commissionError) {
        console.error('Error creando comisión:', commissionError)
      }
    }

    await (supabase as any)
      .from('ticket_batches')
      .update({ sold_count: soldForBatch + 1 })
      .eq('id', batch.id)

    setTicketMessage('Entrada manual creada correctamente.')
    setManualTicketForm({
      batch_id: batch.id,
      source: 'holy',
      rrpp_id: '',
      buyer_first_name: '',
      buyer_last_name: '',
      buyer_dni: '',
      buyer_phone: '',
      buyer_email: '',
    })

    await loadStatsForEvent(selectedEventId)
    setCreatingTicket(false)
  }

  function money(value: number) {
    return `$${value.toLocaleString('es-AR')}`
  }

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
    <main className="min-h-screen bg-black px-4 py-6 pb-28 text-white">
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

        <section className="grid grid-cols-2 gap-2 rounded-3xl border border-zinc-800 bg-zinc-950 p-2">
          <button
            onClick={() => {
              setActiveTab('free')
              setExpanded(null)
            }}
            className={
              activeTab === 'free'
                ? 'rounded-2xl bg-yellow-400 px-3 py-3 text-xs font-black uppercase tracking-[0.14em] text-black'
                : 'rounded-2xl bg-black px-3 py-3 text-xs font-black uppercase tracking-[0.14em] text-zinc-400'
            }
          >
            Lista free
          </button>

          <button
            onClick={() => {
              setActiveTab('anticipadas')
              setExpanded(null)
            }}
            className={
              activeTab === 'anticipadas'
                ? 'rounded-2xl bg-yellow-400 px-3 py-3 text-xs font-black uppercase tracking-[0.14em] text-black'
                : 'rounded-2xl bg-black px-3 py-3 text-xs font-black uppercase tracking-[0.14em] text-zinc-400'
            }
          >
            Anticipadas
          </button>
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
            {activeTab === 'free' ? (
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
            ) : (
              <>
                <section className="grid grid-cols-2 gap-3">
                  <Card title="Vendidas" value={ticketSummary.totalSold} />
                  <Card title="Entraron" value={ticketSummary.totalUsed} green />
                  <Card title="Pendientes" value={ticketSummary.totalPendingEntry} />
                  <MoneyCard title="Recaudado" value={ticketSummary.totalGross} />
                  <MoneyCard title="Comisiones" value={ticketSummary.totalCommissions} />
                  <MoneyCard title="Neto HOLY" value={ticketSummary.totalNet} />
                </section>

                <section className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-black text-yellow-400">Anticipadas activas</h2>
                    <p className="text-sm text-zinc-400">
                      {event.name || 'Evento'} · tandas creadas desde el evento.
                    </p>
                  </div>

                  {ticketBatches.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-400">
                      Este evento no tiene anticipadas cargadas.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {ticketBatches.map((batch) => {
                        const sales = batchSales.get(batch.id)
                        const sold = sales?.sold ?? batch.sold_count ?? 0
                        const used = sales?.used ?? 0
                        const pendingEntry = sales?.pending ?? Math.max(sold - used, 0)
                        const stock = batch.stock
                        const available = typeof stock === 'number' ? Math.max(stock - sold, 0) : null
                        const gross = sales?.gross ?? sold * batch.price
                        const commissions = sales?.commissions ?? 0
                        const isSoldOut = typeof stock === 'number' && sold >= stock

                        return (
                          <div
                            key={batch.id}
                            className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-400">
                                  {batch.batch_order}° tanda
                                </p>
                                <h3 className="mt-1 text-lg font-black text-white">
                                  {batch.name}
                                </h3>
                                <p className="mt-1 text-sm text-zinc-400">
                                  Precio {money(batch.price)} · Comisión RRPP {money(batch.rrpp_commission)}
                                </p>
                              </div>

                              <span
                                className={
                                  isSoldOut
                                    ? 'rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-black text-red-300'
                                    : batch.active
                                    ? 'rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300'
                                    : 'rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-black text-zinc-400'
                                }
                              >
                                {isSoldOut ? 'AGOTADA' : batch.active ? 'ACTIVA' : 'PAUSADA'}
                              </span>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2">
                              <Mini label="Vendidas" value={sold} />
                              <Mini label="Entraron" value={used} />
                              <Mini label="Pendientes" value={pendingEntry} />
                              <Mini label="Stock" value={stock ?? 0} />
                              <MiniMoney label="Total" value={gross} />
                              <MiniMoney label="Comisión" value={commissions} />
                            </div>

                            <div className="mt-3 rounded-2xl border border-zinc-800 bg-black p-3">
                              <div className="mb-2 flex items-center justify-between text-xs font-bold text-zinc-400">
                                <span>Disponible</span>
                                <span>
                                  {available === null
                                    ? 'Ilimitado'
                                    : `${available.toLocaleString('es-AR')} de ${stock?.toLocaleString('es-AR')}`}
                                </span>
                              </div>

                              {available !== null ? (
                                <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                                  <div
                                    className="h-full rounded-full bg-yellow-400"
                                    style={{
                                      width: `${Math.min((sold / Math.max(stock || 1, 1)) * 100, 100)}%`,
                                    }}
                                  />
                                </div>
                              ) : (
                                <p className="text-sm font-bold text-emerald-300">
                                  Sin límite de stock.
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </section>

                <section className="space-y-3 rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-400">
                        Compradores y QR
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">
                        Cargá una entrada manual para probar recuperación por DNI, WhatsApp y QR.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowManualTicketForm((value) => !value)}
                      className="rounded-2xl bg-yellow-400 px-3 py-2 text-xs font-black text-black"
                    >
                      {showManualTicketForm ? 'CERRAR' : '+ ENTRADA'}
                    </button>
                  </div>

                  {ticketMessage ? (
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-300">
                      {ticketMessage}
                    </div>
                  ) : null}

                  {ticketError ? (
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-300">
                      {ticketError}
                    </div>
                  ) : null}

                  {showManualTicketForm ? (
                    <div className="space-y-3 rounded-3xl border border-yellow-500/30 bg-black p-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
                          Tanda
                        </label>
                        <select
                          value={manualTicketForm.batch_id}
                          onChange={(e) => setManualTicketForm((prev) => ({ ...prev, batch_id: e.target.value }))}
                          className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm font-bold text-white outline-none focus:border-yellow-400"
                        >
                          {ticketBatches.map((batch) => (
                            <option key={batch.id} value={batch.id} className="bg-black text-white">
                              {batch.name} · {money(batch.price)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setManualTicketForm((prev) => ({ ...prev, source: 'holy', rrpp_id: '' }))}
                          className={
                            manualTicketForm.source === 'holy'
                              ? 'rounded-2xl bg-yellow-400 px-3 py-3 text-xs font-black text-black'
                              : 'rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-xs font-black text-zinc-400'
                          }
                        >
                          HOLY
                        </button>

                        <button
                          onClick={() => setManualTicketForm((prev) => ({ ...prev, source: 'rrpp' }))}
                          className={
                            manualTicketForm.source === 'rrpp'
                              ? 'rounded-2xl bg-yellow-400 px-3 py-3 text-xs font-black text-black'
                              : 'rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-xs font-black text-zinc-400'
                          }
                        >
                          RRPP
                        </button>
                      </div>

                      {manualTicketForm.source === 'rrpp' ? (
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
                            RRPP vendedor
                          </label>
                          <select
                            value={manualTicketForm.rrpp_id}
                            onChange={(e) => setManualTicketForm((prev) => ({ ...prev, rrpp_id: e.target.value }))}
                            className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm font-bold text-white outline-none focus:border-yellow-400"
                          >
                            <option value="" className="bg-black text-white">Elegir RRPP</option>
                            {rrpps.map((rrpp) => (
                              <option key={rrpp.id} value={rrpp.id} className="bg-black text-white">
                                {rrpp.display_name || 'RRPP sin nombre'}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Input
                          label="Nombre"
                          value={manualTicketForm.buyer_first_name}
                          onChange={(value) => setManualTicketForm((prev) => ({ ...prev, buyer_first_name: value }))}
                          placeholder="Juan"
                        />
                        <Input
                          label="Apellido"
                          value={manualTicketForm.buyer_last_name}
                          onChange={(value) => setManualTicketForm((prev) => ({ ...prev, buyer_last_name: value }))}
                          placeholder="Pérez"
                        />
                        <Input
                          label="DNI"
                          value={manualTicketForm.buyer_dni}
                          onChange={(value) => setManualTicketForm((prev) => ({ ...prev, buyer_dni: value }))}
                          placeholder="12345678"
                        />
                        <Input
                          label="WhatsApp"
                          value={manualTicketForm.buyer_phone}
                          onChange={(value) => setManualTicketForm((prev) => ({ ...prev, buyer_phone: value }))}
                          placeholder="2984..."
                        />
                        <div className="sm:col-span-2">
                          <Input
                            label="Email opcional"
                            value={manualTicketForm.buyer_email}
                            onChange={(value) => setManualTicketForm((prev) => ({ ...prev, buyer_email: value }))}
                            placeholder="cliente@email.com"
                          />
                        </div>
                      </div>

                      <button
                        onClick={createManualTicket}
                        disabled={creatingTicket || ticketBatches.length === 0}
                        className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-black disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
                      >
                        {creatingTicket ? 'CREANDO...' : 'CREAR ENTRADA PAGADA'}
                      </button>
                    </div>
                  ) : null}

                  <input
                    value={ticketSearch}
                    onChange={(e) => setTicketSearch(e.target.value)}
                    placeholder="Buscar por nombre, DNI, WhatsApp, código o RRPP"
                    className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-zinc-600 focus:border-yellow-400"
                  />

                  {filteredTickets.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-800 bg-black p-4 text-sm text-zinc-400">
                      No hay entradas cargadas para este evento todavía.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredTickets.map((ticket) => {
                        const batch = batchById.get(ticket.batch_id)
                        const rrppName = ticket.rrpp_id ? rrppById.get(ticket.rrpp_id)?.display_name || 'RRPP' : 'HOLY directo'
                        const isUsed = !!ticket.entry_used_at

                        return (
                          <div key={ticket.id} className="rounded-3xl border border-zinc-800 bg-black p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-base font-black text-white">
                                  {ticket.buyer_first_name} {ticket.buyer_last_name}
                                </p>
                                <p className="mt-1 text-xs text-zinc-500">
                                  DNI {ticket.buyer_dni || '---'} · {ticket.buyer_phone || 'Sin WhatsApp'}
                                </p>
                              </div>

                              <span
                                className={
                                  isUsed
                                    ? 'rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-black text-emerald-300'
                                    : 'rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2 py-1 text-[10px] font-black text-yellow-300'
                                }
                              >
                                {isUsed ? 'USADA' : 'VÁLIDA'}
                              </span>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                              <div className="rounded-2xl bg-zinc-950 p-3">
                                <p className="text-[10px] uppercase tracking-widest text-zinc-500">Entrada</p>
                                <p className="mt-1 font-bold text-white">{batch?.name || 'Tanda'}</p>
                              </div>
                              <div className="rounded-2xl bg-zinc-950 p-3">
                                <p className="text-[10px] uppercase tracking-widest text-zinc-500">Precio</p>
                                <p className="mt-1 font-black text-emerald-400">{money(ticket.price)}</p>
                              </div>
                              <div className="rounded-2xl bg-zinc-950 p-3">
                                <p className="text-[10px] uppercase tracking-widest text-zinc-500">Origen</p>
                                <p className="mt-1 font-bold text-white">{rrppName}</p>
                              </div>
                              <div className="rounded-2xl bg-zinc-950 p-3">
                                <p className="text-[10px] uppercase tracking-widest text-zinc-500">Código</p>
                                <p className="mt-1 truncate font-mono text-xs font-bold text-white">{ticket.ticket_code}</p>
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <button
                                onClick={() => setSelectedTicketForQr(ticket)}
                                className="rounded-2xl bg-yellow-400 px-3 py-3 text-xs font-black text-black"
                              >
                                VER QR
                              </button>

                              <button
                                onClick={() => copyPrivateTicketLink(ticket)}
                                className="rounded-2xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-xs font-black text-white"
                              >
                                {copied === ticket.id ? 'COPIADO ✅' : 'COPIAR LINK'}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </section>
              </>
            )}
          </>
        )}

        {selectedTicketForQr ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6">
            <div className="w-full max-w-sm rounded-3xl border border-yellow-500/30 bg-zinc-950 p-5 text-center shadow-[0_0_50px_rgba(234,179,8,0.18)]">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-400">Entrada QR</p>
              <h3 className="mt-2 text-xl font-black text-white">
                {selectedTicketForQr.buyer_first_name} {selectedTicketForQr.buyer_last_name}
              </h3>
              <p className="mt-1 text-sm text-zinc-400">
                {batchById.get(selectedTicketForQr.batch_id)?.name || 'Anticipada'} · {money(selectedTicketForQr.price)}
              </p>

              <div className="mx-auto mt-4 w-fit rounded-3xl bg-white p-3">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(selectedTicketForQr.qr_token)}`}
                  alt="QR entrada"
                  className="h-60 w-60"
                />
              </div>

              <p className="mt-3 break-all rounded-2xl bg-black p-3 font-mono text-[11px] text-zinc-400">
                {selectedTicketForQr.ticket_code}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => copyPrivateTicketLink(selectedTicketForQr)}
                  className="rounded-2xl bg-yellow-400 px-3 py-3 text-xs font-black text-black"
                >
                  COPIAR LINK
                </button>
                <button
                  onClick={() => setSelectedTicketForQr(null)}
                  className="rounded-2xl border border-zinc-700 bg-black px-3 py-3 text-xs font-black text-white"
                >
                  CERRAR
                </button>
              </div>
            </div>
          </div>
        ) : null}

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

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm font-bold text-white outline-none placeholder:text-zinc-700 focus:border-yellow-400"
      />
    </label>
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
