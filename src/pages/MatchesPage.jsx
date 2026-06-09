import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDay(dateStr) {
  const d = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  if (d.toDateString() === today.toDateString()) return "Aujourd'hui"
  if (d.toDateString() === tomorrow.toDateString()) return 'Demain'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function groupByDay(matches) {
  const map = new Map()
  for (const m of matches) {
    const key = new Date(m.start_time).toDateString()
    if (!map.has(key)) map.set(key, { dateStr: m.start_time, matches: [] })
    map.get(key).matches.push(m)
  }
  return [...map.values()].sort((a, b) => new Date(a.dateStr) - new Date(b.dateStr))
}

// ─── Composant : bouton de cote ──────────────────────────────────────────────

function OddsBtn({ label, value, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center gap-0.5 py-2.5 rounded-xl flex-1
        text-sm font-bold border transition-all duration-150 active:scale-95
        ${selected
          ? 'bg-brand-600 border-brand-500 text-white shadow-md shadow-brand-900/60'
          : 'bg-gray-800/70 border-gray-700/60 text-gray-300 hover:border-brand-600/60 hover:text-white hover:bg-gray-800'
        }
      `}
    >
      <span className={`text-[10px] font-normal ${selected ? 'text-brand-200' : 'text-gray-500'}`}>{label}</span>
      <span>{value}</span>
    </button>
  )
}

// ─── Composant : carte de match ──────────────────────────────────────────────

function MatchCard({ match, slip, onToggle }) {
  const home = match.odds?.find(o => o.selection === 'home')
  const draw = match.odds?.find(o => o.selection === 'draw')
  const away = match.odds?.find(o => o.selection === 'away')
  const hasSelection = slip.some(s => s.match_id === match.id)
  const isSelected = (sel) => slip.some(s => s.match_id === match.id && s.selection === sel)

  return (
    <div className={`
      rounded-2xl overflow-hidden border transition-all duration-200
      ${hasSelection
        ? 'bg-gray-900 border-brand-800/60 shadow-lg shadow-brand-950/40'
        : 'bg-gray-900 border-gray-800/60'
      }
    `}>
      <div className="flex items-center justify-between px-4 pt-3 pb-2.5 border-b border-gray-800/50">
        <span className="text-[11px] text-gray-500 font-medium tracking-wide uppercase">
          ⚽ {match.league}
        </span>
        <span className="text-[11px] text-gray-500 font-medium tabular-nums">
          {formatTime(match.start_time)}
        </span>
      </div>

      <div className="px-4 pt-3 pb-4">
        <div className="flex items-center mb-4 gap-2">
          <span className="flex-1 font-semibold text-white text-sm leading-snug">{match.home_team}</span>
          <span className="text-[10px] text-gray-600 font-bold px-1.5 py-0.5 rounded-md bg-gray-800">VS</span>
          <span className="flex-1 font-semibold text-white text-sm leading-snug text-right">{match.away_team}</span>
        </div>

        {(home || draw || away) ? (
          <div className="flex gap-2">
            {home && <OddsBtn label="1" value={home.value} selected={isSelected('home')} onClick={() => onToggle(match, 'home', '1', parseFloat(home.value))} />}
            {draw && <OddsBtn label="N" value={draw.value} selected={isSelected('draw')} onClick={() => onToggle(match, 'draw', 'N', parseFloat(draw.value))} />}
            {away && <OddsBtn label="2" value={away.value} selected={isSelected('away')} onClick={() => onToggle(match, 'away', '2', parseFloat(away.value))} />}
          </div>
        ) : (
          <p className="text-xs text-gray-600 text-center py-1">Cotes non disponibles</p>
        )}
      </div>
    </div>
  )
}

// ─── Composant : ticket de pari (sticky) ─────────────────────────────────────

function BettingSlip({ slip, onRemove, onClear, totalOdds, isOverLimit, balance, onConfirm, isPlacing }) {
  const [stakeStr, setStakeStr] = useState('')
  const stake = parseInt(stakeStr) || 0
  const payout = stake > 0 && !isOverLimit ? Math.floor(stake * totalOdds) : 0
  const canSubmit = stake > 0 && stake <= balance && !isOverLimit && !isPlacing

  function getSelLabel(s) {
    const [home, away] = s.match_label.split(' - ')
    if (s.selection === 'home') return home
    if (s.selection === 'away') return away
    return 'Match nul'
  }

  if (slip.length === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-900 border-t border-gray-800 shadow-2xl shadow-black mx-0 sm:mx-4 sm:mb-4 sm:rounded-2xl sm:border overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/80">
            <div className="flex items-center gap-2">
              <span className="text-base">🎫</span>
              <span className="text-sm font-bold text-white">
                Mon ticket
              </span>
              <span className="text-xs text-gray-500 bg-gray-800 rounded-full px-2 py-0.5">
                {slip.length} sél.
              </span>
            </div>
            <button onClick={onClear} className="text-gray-600 hover:text-gray-400 text-xs transition-colors">
              Vider ×
            </button>
          </div>

          <div className="px-4 py-3 space-y-3">
            {/* Sélections */}
            <div className="space-y-2">
              {slip.map(s => (
                <div key={s.match_id} className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-500 truncate">{s.match_label}</p>
                    <p className="text-xs font-semibold text-white">
                      {getSelLabel(s)}
                      <span className="text-brand-400 ml-1.5">× {s.odds_value.toFixed(2)}</span>
                    </p>
                  </div>
                  <button onClick={() => onRemove(s.match_id)} className="text-gray-700 hover:text-gray-500 transition-colors shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Cote totale */}
            <div className="flex items-center justify-between py-2 border-t border-b border-gray-800/80">
              <span className="text-xs text-gray-500">Cote totale</span>
              <span className={`text-sm font-bold tabular-nums ${isOverLimit ? 'text-red-400' : 'text-white'}`}>
                × {totalOdds.toFixed(2)}
                {isOverLimit && <span className="ml-1.5 text-[10px] font-normal bg-red-900/50 text-red-400 px-1.5 py-0.5 rounded-full">Limite ×50 dépassée</span>}
              </span>
            </div>

            {/* Mise + gain */}
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <input
                  type="number"
                  inputMode="numeric"
                  value={stakeStr}
                  onChange={e => setStakeStr(e.target.value)}
                  placeholder="Mise en points"
                  min={1}
                  max={balance}
                  className="w-full bg-gray-800 border border-gray-700 focus:border-brand-500 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600 pointer-events-none">pts</span>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] text-gray-500">Gain potentiel</p>
                <p className={`text-sm font-bold tabular-nums ${payout > 0 ? 'text-brand-400' : 'text-gray-600'}`}>
                  {payout > 0 ? payout.toLocaleString('fr-FR') : '—'} pts
                </p>
              </div>
            </div>

            {stake > balance && (
              <p className="text-xs text-red-400 -mt-1">Solde insuffisant ({(balance ?? 0).toLocaleString('fr-FR')} pts disponibles)</p>
            )}

            {/* Bouton valider */}
            <button
              onClick={() => onConfirm(stake, () => setStakeStr(''))}
              disabled={!canSubmit}
              className="w-full bg-brand-600 hover:bg-brand-500 active:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors text-sm"
            >
              {isPlacing
                ? '⟳ Validation en cours…'
                : payout > 0
                  ? `Valider · Gain potentiel ${payout.toLocaleString('fr-FR')} pts`
                  : 'Valider le ticket'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function MatchesPage() {
  const { balance, refetchProfile } = useAuth()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState(null)
  const [isPlacing, setIsPlacing] = useState(false)
  const [slip, setSlip] = useState([])

  useEffect(() => { fetchMatches() }, [])

  async function fetchMatches() {
    const { data } = await supabase
      .from('matches')
      .select('*, odds(*)')
      .eq('status', 'upcoming')
      .order('start_time', { ascending: true })
    setMatches(data ?? [])
    setLoading(false)
  }

  async function syncMatches() {
    setSyncing(true)
    try {
      await supabase.functions.invoke('sync-matches')
      await fetchMatches()
      showToast('✅ Matchs mis à jour', 'success')
    } catch {
      showToast('Erreur lors de la synchronisation', 'error')
    } finally {
      setSyncing(false)
    }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function toggleSelection(match, selection, label, oddsValue) {
    setSlip(prev => {
      const existingIdx = prev.findIndex(s => s.match_id === match.id && s.selection === selection)
      if (existingIdx !== -1) return prev.filter((_, i) => i !== existingIdx)

      const sameMatch = prev.findIndex(s => s.match_id === match.id)
      const entry = {
        match_id: match.id,
        match_label: `${match.home_team} - ${match.away_team}`,
        market: 'h2h',
        selection,
        label,
        odds_value: oddsValue,
      }
      if (sameMatch !== -1) {
        const updated = [...prev]
        updated[sameMatch] = entry
        return updated
      }
      return [...prev, entry]
    })
  }

  async function handleConfirm(stake, resetStake) {
    if (!stake || stake <= 0) return
    setIsPlacing(true)
    try {
      const { data, error } = await supabase.functions.invoke('place-bet', {
        body: {
          stake,
          selections: slip.map(s => ({
            match_id: s.match_id,
            market: s.market,
            selection: s.selection,
            odds_value: s.odds_value,
          })),
        },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      setSlip([])
      resetStake()
      await refetchProfile()
      showToast(`🎉 Pari enregistré ! Gain potentiel : ${data.potential_payout?.toLocaleString('fr-FR')} pts`, 'success')
    } catch (err) {
      showToast(err.message || 'Erreur lors de la validation', 'error')
    } finally {
      setIsPlacing(false)
    }
  }

  const totalOdds = slip.reduce((acc, s) => Math.round(acc * s.odds_value * 100) / 100, 1)
  const isOverLimit = totalOdds > 50
  const groups = useMemo(() => groupByDay(matches), [matches])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <span className="animate-spin text-brand-500">⟳</span> Chargement…
      </div>
    </div>
  )

  return (
    <div className={slip.length > 0 ? 'pb-64' : 'pb-4'}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Coupe du Monde 2026</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {matches.length > 0 ? `${matches.length} match${matches.length > 1 ? 's' : ''} à venir` : 'Aucun match chargé'}
          </p>
        </div>
        <button
          onClick={syncMatches}
          disabled={syncing}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-400 transition-colors disabled:opacity-50 mt-1"
        >
          <span className={syncing ? 'animate-spin' : ''}>⟳</span>
          {syncing ? 'Sync…' : 'Actualiser'}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm border transition-all ${
          toast.type === 'success'
            ? 'bg-brand-950/60 border-brand-800/60 text-brand-300'
            : 'bg-red-950/60 border-red-800/60 text-red-300'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Matchs ou empty state */}
      {groups.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-6xl mb-5">⚽</div>
          <p className="text-white font-semibold text-lg">Aucun match disponible</p>
          <p className="text-gray-500 text-sm mt-2 mb-6">Charge les matchs de la Coupe du Monde pour commencer à parier.</p>
          <button
            onClick={syncMatches}
            disabled={syncing}
            className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            {syncing ? '⟳ Chargement…' : '⟳ Charger les matchs'}
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(group => (
            <section key={group.dateStr}>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1 capitalize">
                {formatDay(group.dateStr)}
              </h2>
              <div className="space-y-3">
                {group.matches.map(match => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    slip={slip}
                    onToggle={toggleSelection}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Ticket sticky */}
      <BettingSlip
        slip={slip}
        onRemove={(matchId) => setSlip(prev => prev.filter(s => s.match_id !== matchId))}
        onClear={() => setSlip([])}
        totalOdds={totalOdds}
        isOverLimit={isOverLimit}
        balance={balance ?? 0}
        onConfirm={handleConfirm}
        isPlacing={isPlacing}
      />
    </div>
  )
}
