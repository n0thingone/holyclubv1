'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'

type TicketRow = {
  id: string
  order_id: string
  event_id: string
  batch_id: string
  source: string | null
  rrpp_id: string | null
  buyer_first_name: string | null
  buyer_last_name: string | null
  buyer_dni: string | null
  buyer_phone: string | null
  buyer_email: string | null
  ticket_code: string
  public_token: string
  qr_token: string
  price: number
  rrpp_commission: number | null
  payment_status: string | null
  status: string | null
  entry_used_at: string | null
  created_at: string | null
}

type EventRow = {
  id: string
  name: string | null
  event_date: string | null
  status: string | null
  is_active: boolean | null
  is_closed: boolean | null
  event_image_url?: string | null
}

type BatchRow = {
  id: string
  name: string | null
  price: number | null
}

export default function PublicTicketPage() {
  const params = useParams<{ token: string }>()
  const token = String(params?.token || '')
  const supabase = useMemo(() => getSupabaseClient(), [])

  const [loading, setLoading] = useState(true)
  const [ticket, setTicket] = useState<TicketRow | null>(null)
  const [event, setEvent] = useState<EventRow | null>(null)
  const [batch, setBatch] = useState<BatchRow | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function loadTicket() {
      if (!token) {
        setError('Link inválido.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select(
          'id,order_id,event_id,batch_id,source,rrpp_id,buyer_first_name,buyer_last_name,buyer_dni,buyer_phone,buyer_email,ticket_code,public_token,qr_token,price,rrpp_commission,payment_status,status,entry_used_at,created_at'
        )
        .eq('public_token', token)
        .maybeSingle()

      if (ticketError) {
        console.error('Error cargando ticket:', ticketError)
        setError('No se pudo cargar la entrada.')
        setLoading(false)
        return
      }

      if (!ticketData) {
        setError('No encontramos esta entrada.')
        setLoading(false)
        return
      }

      const typedTicket = ticketData as TicketRow
      setTicket(typedTicket)

      const [eventRes, batchRes] = await Promise.all([
        supabase
          .from('events')
          .select('id,name,event_date,status,is_active,is_closed,event_image_url')
          .eq('id', typedTicket.event_id)
          .maybeSingle(),
        supabase
          .from('ticket_batches')
          .select('id,name,price')
          .eq('id', typedTicket.batch_id)
          .maybeSingle(),
      ])

      if (eventRes.error) console.error('Error cargando evento:', eventRes.error)
      if (batchRes.error) console.error('Error cargando tanda:', batchRes.error)

      setEvent((eventRes.data || null) as EventRow | null)
      setBatch((batchRes.data || null) as BatchRow | null)
      setLoading(false)
    }

    loadTicket()
  }, [supabase, token])

  function money(value?: number | null) {
    return `$${Number(value || 0).toLocaleString('es-AR')}`
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

  async function copyLink() {
    if (typeof window === 'undefined') return
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const fullName = ticket
    ? `${ticket.buyer_first_name || ''} ${ticket.buyer_last_name || ''}`.trim() || 'Sin nombre'
    : ''

  const isUsed = !!ticket?.entry_used_at
  const isPaid = ticket?.payment_status === 'paid'
  const isCancelled = ticket?.status === 'cancelled'

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <div className="mx-auto max-w-sm space-y-4 pb-10">
        <section className="overflow-hidden rounded-[30px] border border-yellow-500/30 bg-zinc-950 shadow-[0_0_45px_rgba(234,179,8,0.12)]">
          {event?.event_image_url ? (
            <img src={event.event_image_url} alt={event.name || 'Evento'} className="h-40 w-full object-cover opacity-80" />
          ) : null}

          <div className="p-5 text-center">
            <p className="text-xs font-black uppercase tracking-[0.32em] text-yellow-400">HOLY CLUB</p>
            <h1 className="mt-2 text-2xl font-black">ENTRADA</h1>
            <p className="mt-1 text-sm text-zinc-400">Tu QR para ingresar al evento.</p>
          </div>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 text-center text-zinc-400">
            Cargando entrada...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-500/40 bg-red-950/30 p-5 text-center text-red-200">
            <p className="text-lg font-black">Entrada no encontrada</p>
            <p className="mt-2 text-sm">{error}</p>
          </div>
        ) : ticket ? (
          <>
            <section className="rounded-[30px] border border-yellow-500/30 bg-zinc-950 p-5 text-center">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-400">
                {event?.name || 'Evento'}
              </p>

              <h2 className="mt-3 text-2xl font-black">{fullName}</h2>
              <p className="mt-1 text-sm text-zinc-400">
                {batch?.name || 'Anticipada'} · {money(ticket.price)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">{formatDate(event?.event_date)}</p>

              <div className="mx-auto mt-5 w-fit rounded-3xl bg-white p-3">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(ticket.qr_token)}`}
                  alt="QR entrada"
                  className="h-64 w-64"
                />
              </div>

              <div className="mt-4 rounded-2xl bg-black px-4 py-3 font-mono text-sm font-black text-zinc-300">
                {ticket.ticket_code}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-left">
                <Info label="Estado pago" value={isPaid ? 'PAGADA' : String(ticket.payment_status || 'PENDIENTE').toUpperCase()} green={isPaid} />
                <Info label="Ingreso" value={isUsed ? 'USADA' : 'DISPONIBLE'} green={!isUsed} />
                <Info label="DNI" value={ticket.buyer_dni || '---'} />
                <Info label="WhatsApp" value={ticket.buyer_phone || '---'} />
              </div>

              {isCancelled ? (
                <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
                  Esta entrada figura cancelada.
                </div>
              ) : null}

              <button
                onClick={copyLink}
                className="mt-5 w-full rounded-2xl bg-yellow-400 px-4 py-3 text-sm font-black text-black transition hover:bg-yellow-300"
              >
                {copied ? 'LINK COPIADO ✅' : 'COPIAR LINK'}
              </button>
            </section>

            <p className="px-2 text-center text-xs text-zinc-500">
              Presentá este QR en puerta. Si no lo tenés a mano, el staff puede buscar tu entrada por DNI o WhatsApp.
            </p>
          </>
        ) : null}
      </div>
    </main>
  )
}

function Info({ label, value, green = false }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className={green ? 'mt-1 text-sm font-black text-emerald-400' : 'mt-1 text-sm font-black text-white'}>{value}</p>
    </div>
  )
}
