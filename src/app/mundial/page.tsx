'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'

type Match = {
  id: string
  home_team: string
  away_team: string
  home_flag: string | null
  away_flag: string | null
  kickoff_at: string
  voting_closes_at: string
  status: string
  home_score: number | null
  away_score: number | null
  display_order: number
}

type Prediction = {
  id: string
  user_id: string
  match_id: string
  predicted_home_score: number
  predicted_away_score: number
  reward_status: string | null
  created_at: string
}

type MatchOutcome = 'none' | 'pending' | 'win' | 'lose'

function normalizeFlagKey(value?: string | null) {
  return String(value || '').trim().toUpperCase()
}

function getFlagCode(team: string, flag?: string | null) {
  const valueKey = normalizeFlagKey(flag)
  const teamKey = normalizeFlagKey(team)
  const key = valueKey || teamKey

  if (key === 'AR' || key === 'ARG' || key === 'ARGENTINA') return 'ar'
  if (key === 'DZ' || key === 'DZA' || key === 'ARGELIA') return 'dz'
  if (key === 'AT' || key === 'AUT' || key === 'AUSTRIA') return 'at'
  if (key === 'JO' || key === 'JOR' || key === 'JORDANIA') return 'jo'

  if (teamKey === 'ARGENTINA') return 'ar'
  if (teamKey === 'ARGELIA') return 'dz'
  if (teamKey === 'AUSTRIA') return 'at'
  if (teamKey === 'JORDANIA') return 'jo'

  return null
}

function FlagIcon({
  team,
  flag,
  size = 'md',
}: {
  team: string
  flag?: string | null
  size?: 'sm' | 'md' | 'lg'
}) {
  const code = getFlagCode(team, flag)

  if (!code) {
    return <span className={size === 'lg' ? 'text-3xl' : 'text-2xl'}>🏆</span>
  }

  const className =
    size === 'lg'
      ? 'h-9 w-12 rounded-md object-cover shadow'
      : size === 'sm'
      ? 'h-5 w-7 rounded object-cover shadow'
      : 'h-7 w-10 rounded object-cover shadow'

  return (
    <img
      src={`https://flagcdn.com/w80/${code}.png`}
      alt={team}
      className={className}
    />
  )
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}

function formatRemaining(targetDate: string, now: Date) {
  const target = new Date(targetDate).getTime()
  const diff = target - now.getTime()

  if (diff <= 0) return '00:00:00'

  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const hh = String(hours).padStart(2, '0')
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')

  if (days > 0) return `${days}d ${hh}:${mm}:${ss}`
  return `${hh}:${mm}:${ss}`
}

function getStatusLabel(match: Match, now: Date) {
  const closesAt = new Date(match.voting_closes_at)
  const kickoffAt = new Date(match.kickoff_at)

  if (match.status === 'finished') return 'Finalizado'
  if (match.status === 'conditional') return 'Si Argentina clasifica'
  if (match.status === 'locked') return 'Próximamente'

  if (match.status === 'open') {
    if (now >= closesAt && now < kickoffAt) return 'Votación cerrada'
    if (now >= kickoffAt) return 'Partido en juego'
    return 'Abierto'
  }

  return match.status
}

function getStatusClass(match: Match, outcome: MatchOutcome) {
  if (outcome === 'win') {
    return 'border-emerald-300/50 bg-emerald-400/20 text-emerald-100'
  }

  if (outcome === 'lose') {
    return 'border-red-300/50 bg-red-400/20 text-red-100'
  }

  if (match.status === 'open') {
    return 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200'
  }

  if (match.status === 'conditional') {
    return 'border-fuchsia-400/40 bg-fuchsia-400/15 text-fuchsia-200'
  }

  if (match.status === 'finished') {
    return 'border-yellow-400/40 bg-yellow-400/15 text-yellow-200'
  }

  return 'border-white/10 bg-white/10 text-white/60'
}

function getDisabledButtonLabel(
  match: Match,
  now: Date,
  isLoggedIn: boolean,
  alreadyVoted: boolean
) {
  const closesAt = new Date(match.voting_closes_at)
  const kickoffAt = new Date(match.kickoff_at)

  if (alreadyVoted) return 'YA VOTASTE'
  if (match.status === 'locked') return 'BLOQUEADO'
  if (match.status === 'conditional') return 'PRÓXIMAMENTE'
  if (match.status === 'finished') return 'FINALIZADO'
  if (!isLoggedIn && match.status === 'open' && now < closesAt) return 'INICIÁ SESIÓN PARA VOTAR'
  if (now >= closesAt && now < kickoffAt) return 'VOTACIÓN CERRADA'
  if (now >= kickoffAt) return 'PARTIDO EN JUEGO'

  return 'NO DISPONIBLE'
}

function getMatchOutcome(match: Match, prediction: Prediction | null): MatchOutcome {
  if (!prediction) return 'none'

  if (
    match.status !== 'finished' ||
    match.home_score === null ||
    match.away_score === null
  ) {
    return 'pending'
  }

  const exact =
    prediction.predicted_home_score === match.home_score &&
    prediction.predicted_away_score === match.away_score

  return exact ? 'win' : 'lose'
}

function getCardClass(outcome: MatchOutcome) {
  if (outcome === 'win') {
    return 'overflow-hidden rounded-[22px] border border-emerald-300/40 bg-emerald-500/15 shadow-[0_0_35px_rgba(16,185,129,0.28)] backdrop-blur'
  }

  if (outcome === 'lose') {
    return 'overflow-hidden rounded-[22px] border border-red-300/35 bg-red-500/15 shadow-[0_0_35px_rgba(239,68,68,0.24)] backdrop-blur'
  }

  return 'overflow-hidden rounded-[22px] border border-violet-300/15 bg-white/[0.065] shadow-[0_0_28px_rgba(124,58,237,0.10)] backdrop-blur'
}

function getCardHeaderClass(outcome: MatchOutcome) {
  if (outcome === 'win') {
    return 'w-full bg-gradient-to-r from-emerald-500/30 via-emerald-400/15 to-green-500/20 px-3 py-3 text-left'
  }

  if (outcome === 'lose') {
    return 'w-full bg-gradient-to-r from-red-500/30 via-rose-500/15 to-red-800/20 px-3 py-3 text-left'
  }

  return 'w-full bg-gradient-to-r from-violet-500/20 via-fuchsia-500/10 to-indigo-500/20 px-3 py-3 text-left'
}

function getOutcomeBadgeLabel(
  outcome: MatchOutcome,
  alreadyVoted: boolean,
  statusLabel: string
) {
  if (outcome === 'win') return 'Ganaste'
  if (outcome === 'lose') return 'No acertaste'
  if (alreadyVoted) return 'Votado'
  return statusLabel
}

function getOutcomeInfo(match: Match, prediction: Prediction | null) {
  const outcome = getMatchOutcome(match, prediction)

  if (!prediction) {
    return {
      outcome,
      title: 'No participaste',
      detail: 'No registraste predicción para este partido.',
      credits: 0,
    }
  }

  if (outcome === 'pending') {
    return {
      outcome,
      title: 'Resultado pendiente',
      detail: 'Cuando HOLY cargue el resultado final, se calculan los premios.',
      credits: 0,
    }
  }

  if (outcome === 'win') {
    return {
      outcome,
      title: 'Resultado exacto 🎯',
      detail: 'Acertaste el marcador final.',
      credits: 10500,
    }
  }

  if (outcome === 'lose') {
    return {
      outcome,
      title: 'No acertaste exacto',
      detail: 'Igual sumás créditos por participar.',
      credits: 500,
    }
  }

  return {
    outcome,
    title: '',
    detail: '',
    credits: 0,
  }
}

function getOutcomeBoxClass(outcome: MatchOutcome) {
  if (outcome === 'win') {
    return 'border-emerald-400/35 bg-emerald-400/15 text-emerald-100'
  }

  if (outcome === 'lose') {
    return 'border-red-400/35 bg-red-400/15 text-red-100'
  }

  return 'border-violet-400/25 bg-violet-400/10 text-violet-100'
}

export default function MundialPage() {
  const supabase = getSupabaseClient()

  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [loadingUser, setLoadingUser] = useState(true)

  const [now, setNow] = useState(new Date())
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null)

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [homeScore, setHomeScore] = useState('')
  const [awayScore, setAwayScore] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    fetchUser()
    fetchMatches()

    const timer = setInterval(() => {
      setNow(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!userId) return
    fetchPredictions(userId)
  }, [userId])

  async function fetchUser() {
    setLoadingUser(true)

    const { data } = await supabase.auth.getUser()
    const currentUserId = data.user?.id || null

    setUserId(currentUserId)
    setLoadingUser(false)

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUserId = session?.user?.id || null
      setUserId(newUserId)

      if (newUserId) {
        fetchPredictions(newUserId)
      } else {
        setPredictions([])
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }

  async function fetchMatches() {
    setLoading(true)

    const { data, error } = await supabase
      .from('worldcup_matches_public')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching matches:', error)
      setMatches([])
    } else {
      const loadedMatches = (data || []) as Match[]
      setMatches(loadedMatches)
      setExpandedMatchId(loadedMatches[0]?.id || null)
    }

    setLoading(false)
  }

  async function fetchPredictions(currentUserId: string) {
    const { data, error } = await supabase
      .from('worldcup_predictions')
      .select('id,user_id,match_id,predicted_home_score,predicted_away_score,reward_status,created_at')
      .eq('user_id', currentUserId)

    if (error) {
      console.error('Error fetching predictions:', error)
      setPredictions([])
      return
    }

    setPredictions((data || []) as Prediction[])
  }

  function getPredictionForMatch(matchId: string) {
    return predictions.find((prediction) => prediction.match_id === matchId) || null
  }

  function goBack() {
    if (typeof window === 'undefined') return

    if (window.history.length > 1) {
      window.history.back()
    } else {
      window.location.href = '/'
    }
  }

  function openVoteModal(match: Match) {
    setSelectedMatch(match)
    setHomeScore('')
    setAwayScore('')
    setMessage('')
    setErrorMessage('')
  }

  function closeVoteModal() {
    if (submitting) return

    setSelectedMatch(null)
    setHomeScore('')
    setAwayScore('')
    setMessage('')
    setErrorMessage('')
  }

  async function submitPrediction() {
    if (!selectedMatch) return

    setMessage('')
    setErrorMessage('')

    if (!userId) {
      setErrorMessage('Necesitás iniciar sesión para votar.')
      return
    }

    const parsedHome = Number(homeScore)
    const parsedAway = Number(awayScore)

    if (!Number.isInteger(parsedHome) || !Number.isInteger(parsedAway)) {
      setErrorMessage('Poné un resultado válido.')
      return
    }

    if (parsedHome < 0 || parsedAway < 0) {
      setErrorMessage('El resultado no puede ser negativo.')
      return
    }

    setSubmitting(true)

    const { data, error } = await supabase.rpc('submit_worldcup_prediction', {
      p_match_id: selectedMatch.id,
      p_home_score: parsedHome,
      p_away_score: parsedAway,
    })

    if (error) {
      console.error('Error submit prediction:', error)
      setErrorMessage('No se pudo guardar el voto.')
      setSubmitting(false)
      return
    }

    if (!data?.success) {
      const errorCode = data?.error

      if (errorCode === 'already_voted') {
        setErrorMessage('Ya votaste este partido.')
      } else if (errorCode === 'voting_closed') {
        setErrorMessage('La votación ya cerró.')
      } else if (errorCode === 'match_not_open') {
        setErrorMessage('Este partido todavía no está abierto para votar.')
      } else if (errorCode === 'not_authenticated') {
        setErrorMessage('Necesitás iniciar sesión para votar.')
      } else {
        setErrorMessage('No se pudo guardar el voto.')
      }

      setSubmitting(false)
      return
    }

    setMessage('Voto guardado correctamente ✅')
    await fetchPredictions(userId)

    setTimeout(() => {
      closeVoteModal()
    }, 900)

    setSubmitting(false)
  }

  return (
    <main className="min-h-screen bg-[#07000f] px-3 pb-12 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-160px] h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-violet-600/35 blur-[90px]" />
        <div className="absolute bottom-[-160px] right-[-80px] h-[300px] w-[300px] rounded-full bg-fuchsia-500/20 blur-[90px]" />
      </div>

      <div className="relative mx-auto max-w-md">
        <header className="sticky top-0 z-40 -mx-3 mb-3 border-b border-white/10 bg-[#07000f]/85 px-3 py-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-md items-center justify-between gap-3">
            <button
              onClick={goBack}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-lg font-black text-white"
            >
              ←
            </button>

            <div className="min-w-0 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-200">
                HOLY
              </p>
              <h2 className="truncate text-sm font-black text-white">
                Mundial
              </h2>
            </div>

            <div className="h-10 w-10" />
          </div>
        </header>

        <section className="mb-4 overflow-hidden rounded-[26px] border border-violet-400/25 bg-gradient-to-br from-violet-950/90 via-zinc-950 to-black p-4 text-center shadow-[0_0_45px_rgba(139,92,246,0.22)]">
          <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
            <FlagIcon team="Argentina" flag="AR" />
          </div>

          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-violet-200">
            HOLY CLUB
          </p>

          <h1 className="mt-1 text-3xl font-black tracking-tight">
            MUNDIAL
          </h1>

          <p className="mx-auto mt-1 max-w-xs text-xs font-medium text-white/65">
            Adiviná resultados de Argentina y ganá créditos.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-2 py-2">
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-emerald-200">
                Participar
              </p>
              <p className="mt-1 text-lg font-black text-white">
                +500
              </p>
            </div>

            <div className="rounded-2xl border border-fuchsia-400/25 bg-fuchsia-400/10 px-2 py-2">
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-fuchsia-200">
                Exacto
              </p>
              <p className="mt-1 text-lg font-black text-white">
                +10.000
              </p>
            </div>
          </div>

          {!loadingUser && !userId ? (
            <div className="mt-3 rounded-2xl border border-yellow-400/25 bg-yellow-400/10 px-3 py-2 text-[11px] font-bold text-yellow-100">
              Iniciá sesión para votar.
            </div>
          ) : null}
        </section>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 text-center text-white/60">
            Cargando partidos...
          </div>
        ) : matches.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 text-center text-white/60">
            No hay partidos cargados todavía.
          </div>
        ) : (
          <div className="space-y-2.5">
            {matches.map((match) => {
              const prediction = getPredictionForMatch(match.id)
              const alreadyVoted = !!prediction
              const outcome = getMatchOutcome(match, prediction)
              const outcomeInfo = getOutcomeInfo(match, prediction)
              const isExpanded = expandedMatchId === match.id

              const statusLabel = getStatusLabel(match, now)

              const baseCanVote =
                match.status === 'open' &&
                now < new Date(match.voting_closes_at)

              const canVote =
                baseCanVote &&
                !!userId &&
                !alreadyVoted

              return (
                <div key={match.id} className={getCardClass(outcome)}>
                  <button
                    onClick={() => setExpandedMatchId(isExpanded ? null : match.id)}
                    className={getCardHeaderClass(outcome)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-violet-100/75">
                          Partido #{match.display_order}
                        </p>

                        <div className="mt-1 flex items-center gap-2">
                          <FlagIcon team={match.home_team} flag={match.home_flag} />
                          <span className="text-sm font-black text-white">
                            {match.home_team}
                          </span>
                          <span className="text-[10px] font-black text-white/40">
                            VS
                          </span>
                          <span className="text-sm font-black text-white">
                            {match.away_team}
                          </span>
                          <FlagIcon team={match.away_team} flag={match.away_flag} />
                        </div>

                        <p className="mt-1 text-[11px] font-bold capitalize text-white/50">
                          {formatDateTime(match.kickoff_at)} hs
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${getStatusClass(match, outcome)}`}>
                          {getOutcomeBadgeLabel(outcome, alreadyVoted, statusLabel)}
                        </span>

                        <span className="text-lg font-black text-white/40">
                          {isExpanded ? '−' : '+'}
                        </span>
                      </div>
                    </div>
                  </button>

                  {isExpanded ? (
                    <div className="border-t border-white/10 p-3">
                      {match.status === 'open' ? (
                        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-center">
                          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-200/70">
                            Cierre de votación
                          </p>
                          <p className="mt-1 text-xs font-bold capitalize text-emerald-100">
                            {formatDateTime(match.voting_closes_at)} hs
                          </p>

                          {baseCanVote ? (
                            <p className="mt-1 text-xs font-black text-emerald-200">
                              Cierra en {formatRemaining(match.voting_closes_at, now)}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      {alreadyVoted && prediction ? (
                        <div className="mt-2 space-y-2">
                          <div className="rounded-2xl border border-violet-400/25 bg-violet-400/10 px-3 py-2 text-center">
                            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-200/70">
                              Tu predicción
                            </p>
                            <p className="mt-1 text-base font-black text-white">
                              {match.home_team} {prediction.predicted_home_score} - {prediction.predicted_away_score} {match.away_team}
                            </p>
                          </div>

                          <div className={`rounded-2xl border px-3 py-2 text-center ${getOutcomeBoxClass(outcome)}`}>
                            <p className="text-[9px] font-black uppercase tracking-[0.18em] opacity-70">
                              Estado de tu voto
                            </p>

                            <p className="mt-1 text-sm font-black">
                              {outcomeInfo.title}
                            </p>

                            <p className="mt-1 text-[11px] font-bold opacity-75">
                              {outcomeInfo.detail}
                            </p>

                            {outcomeInfo.credits > 0 ? (
                              <p className="mt-2 text-lg font-black">
                                +{outcomeInfo.credits.toLocaleString('es-AR')} créditos
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      {match.status === 'finished' ? (
                        <div className="mt-2 rounded-2xl border border-yellow-400/25 bg-yellow-400/10 py-3 text-center text-2xl font-black text-yellow-100">
                          Resultado final: {match.home_score} - {match.away_score}
                        </div>
                      ) : null}

                      {canVote ? (
                        <button
                          onClick={() => openVoteModal(match)}
                          className="mt-3 w-full rounded-2xl bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 px-4 py-3 text-xs font-black text-white shadow-[0_0_20px_rgba(217,70,239,0.28)] transition hover:scale-[1.01]"
                        >
                          VOTAR RESULTADO
                        </button>
                      ) : (
                        <button
                          disabled
                          className="mt-3 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-xs font-black text-white/40"
                        >
                          {getDisabledButtonLabel(match, now, !!userId, alreadyVoted)}
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}

       <section className="mt-5 overflow-hidden rounded-[24px] border border-yellow-300/15 bg-gradient-to-br from-yellow-400/8 via-violet-950/25 to-black px-4 py-4 text-center shadow-[0_0_30px_rgba(250,204,21,0.08)]">
  <div className="flex items-center justify-center gap-3">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-300/20 bg-yellow-300/10 text-3xl shadow-[0_0_22px_rgba(250,204,21,0.14)]">
      🏆
    </div>

    <div className="text-left">
      <p className="text-[9px] font-black uppercase tracking-[0.28em] text-yellow-200/60">
        HOLY CLUB
      </p>

      <h3 className="mt-0.5 text-lg font-black tracking-tight text-white">
        COPA FIFA 2026
      </h3>

      <p className="mt-0.5 text-[10px] font-bold text-white/40">
        Votá, acertá y sumá créditos.
      </p>
    </div>
  </div>
</section>
      </div>

      {selectedMatch ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[30px] border border-violet-400/25 bg-[#10051f] p-5 text-white shadow-[0_0_60px_rgba(168,85,247,0.35)]">
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-violet-200">
                Votar resultado
              </p>

              <h2 className="mt-2 text-2xl font-black">
                {selectedMatch.home_team} vs {selectedMatch.away_team}
              </h2>

              <p className="mt-1 text-xs text-white/50">
                Solo podés votar una vez por partido.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-end gap-3">
              <label className="block text-center">
                <div className="flex justify-center">
                  <FlagIcon team={selectedMatch.home_team} flag={selectedMatch.home_flag} size="lg" />
                </div>

                <span className="mt-2 block text-xs font-bold text-white/70">
                  {selectedMatch.home_team}
                </span>

                <input
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  type="number"
                  min="0"
                  inputMode="numeric"
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-black/35 px-3 py-4 text-center text-3xl font-black text-white outline-none focus:border-violet-300"
                  placeholder="0"
                />
              </label>

              <div className="pb-5 text-lg font-black text-white/50">
                -
              </div>

              <label className="block text-center">
                <div className="flex justify-center">
                  <FlagIcon team={selectedMatch.away_team} flag={selectedMatch.away_flag} size="lg" />
                </div>

                <span className="mt-2 block text-xs font-bold text-white/70">
                  {selectedMatch.away_team}
                </span>

                <input
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  type="number"
                  min="0"
                  inputMode="numeric"
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-black/35 px-3 py-4 text-center text-3xl font-black text-white outline-none focus:border-violet-300"
                  placeholder="0"
                />
              </label>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">
                  Participar
                </p>
                <p className="mt-1 text-lg font-black">
                  +500
                </p>
              </div>

              <div className="rounded-2xl border border-fuchsia-400/25 bg-fuchsia-400/10 px-3 py-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-fuchsia-200">
                  Exacto
                </p>
                <p className="mt-1 text-lg font-black">
                  +10.000
                </p>
              </div>
            </div>

            {message ? (
              <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-center text-sm font-bold text-emerald-200">
                {message}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-center text-sm font-bold text-red-200">
                {errorMessage}
              </div>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={closeVoteModal}
                disabled={submitting}
                className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-sm font-black text-white/70 disabled:opacity-50"
              >
                CANCELAR
              </button>

              <button
                onClick={submitPrediction}
                disabled={submitting}
                className="rounded-2xl bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 px-4 py-4 text-sm font-black text-white shadow-[0_0_25px_rgba(217,70,239,0.35)] disabled:opacity-50"
              >
                {submitting ? 'GUARDANDO...' : 'CONFIRMAR'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}