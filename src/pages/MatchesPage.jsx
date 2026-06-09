import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDay(dateStr) {
  const d = new Date(dateStr); const today = new Date(); const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui"
  if (d.toDateString() === tomorrow.toDateString()) return 'Demain'
  return d.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })
}
function formatTime(dateStr) { return new Date(dateStr).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }) }
function groupByDay(matches) {
  const map = new Map()
  for (const m of matches) {
    const key = new Date(m.start_time).toDateString()
    if (!map.has(key)) map.set(key, { dateStr: m.start_time, matches: [] })
    map.get(key).matches.push(m)
  }
  return [...map.values()].sort((a, b) => new Date(a.dateStr) - new Date(b.dateStr))
}

// ─── Bouton de cote ───────────────────────────────────────────────────────────

function OddsBtn({ label, value, selected, onClick }) {
  return (
    <button onClick={onClick} className={`
      flex flex-col items-center justify-center gap-0.5 py-2.5 rounded-xl flex-1 min-w-0
      text-sm font-bold border transition-all duration-150 active:scale-95
      ${selected
        ? 'bg-brand-600 border-brand-500 text-white shadow-md shadow-brand-900/60'
        : 'bg-gray-800/70 border-gray-700/60 text-gray-300 hover:border-brand-600/60 hover:text-white hover:bg-gray-800'
      }
    `}>
      <span className={`text-[10px] font-normal ${selected ? 'text-brand-200' : 'text-gray-500'}`}>{label}</span>
      <span>{value}</span>
    </button>
  )
}

// ─── Carte de match ───────────────────────────────────────────────────────────

function MatchCard({ match, slip, onToggle }) {
  const home = match.odds?.find(o => o.selection === 'home')
  const draw = match.odds?.find(o => o.selection === 'draw')
  const away = match.odds?.find(o => o.selection === 'away')
  const hasSelection = slip.some(s => s.match_id === match.id)
  const isSelected = (sel) => slip.some(s => s.match_id === match.id && s.selection === sel)
  const isTest = match.external_id?.startsWith('test-')

  return (
    <div className={`rounded-2xl overflow-hidden border transition-all duration-200
      ${hasSelection ? 'bg-gray-900 border-brand-800/60 shadow-lg shadow-brand-950/40' : 'bg-gray-900 border-gray-800/60'}
    `}>
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-800/50">
        <span className="text-[11px] text-gray-500 font-medium tracking-wide uppercase">
          {isTest ? '🧪 Match test' : match.league}
        </span>
        <span className="text-[11px] text-gray-500 font-medium tabular-nums">{formatTime(match.start_time)}</span>
      </div>
      <div className="px-4 pt-3 pb-4">
        <div className="flex items-center mb-4 gap-2">
          <span className="flex-1 font-semibold text-white text-sm leading-snug">{match.home_team}</span>
          <span className="text-[10px] text-gray-600 font-bold px-1.5 py-0.5 rounded-md bg-gray-800">VS</span>
          <span className="flex-1 font-semibold text-white text-sm leading-snug text-right">{match.away_team}</span>
        </div>
        {(home || draw || away) ? (
          <div className="flex gap-2">
            {home && <OddsBtn label="1" value={home.value} selected={isSelected('home')} onClick={() => onToggle(match, 'home', parseFloat(home.value))} />}
            {draw && <OddsBtn label="N" value={draw.value} selected={isSelected('draw')} onClick={() => onToggle(match, 'draw', parseFloat(draw.value))} />}
            {away && <OddsBtn label="2" value={away.value} selected={isSelected('away')} onClick={() => onToggle(match, 'away', parseFloat(away.value))} />}
          </div>
        ) : (
          <p className="text-xs text-gray-600 text-center py-1">Cotes non disponibles</p>
        )}
      </div>
    </div>
  )
}

// ─── Ticket de pari (sidebar desktop / bottom sheet mobile) ──────────────────

function BettingSlip({ slip, onRemove, onClear, balance, onConfirm, isPlacing, isOpen, onToggleOpen }) {
  const [stakeStr, setStakeStr] = useState('')
  const stake = parseInt(stakeStr) || 0
  const totalOdds = slip.reduce((acc, s) => Math.round(acc * s.odds_value * 100) / 100, 1)
  const isOverLimit = totalOdds > 50
  const payout = stake > 0 && !isOverLimit ? Math.floor(stake * totalOdds) : 0
  const canSubmit = stake > 0 && stake <= balance && !isOverLimit && !isPlacing && slip.length > 0

  function selLabel(s) {
    if (s.selection === 'home') return s.home_team
    if (s.selection === 'away') return s.away_team
    return 'Match nul'
  }

  // ── Tab sticky (mobile) ──
  const MobileTab = () => (
    <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 px-3 pb-2">
      <button onClick={onToggleOpen}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border shadow-2xl shadow-black/60 transition-all
          ${slip.length > 0 ? 'bg-brand-700 border-brand-600 text-white' : 'bg-gray-900 border-gray-700 text-gray-400'}
        `}>
        <div className="flex items-center gap-2.5">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black
            ${slip.length > 0 ? 'bg-white/20 text-white' : 'bg-gray-800 text-gray-500'}`}>
            {slip.length}
          </div>
          <span className="text-sm font-bold">Mon coupon</span>
          {slip.length > 0 && !isOverLimit && (
            <span className="text-brand-200 text-xs">x {totalOdds.toFixed(2)}</span>
          )}
          {isOverLimit && <span className="text-red-300 text-xs">Limite depassee</span>}
        </div>
        <div className="flex items-center gap-2">
          {payout > 0 && <span className="text-sm font-bold text-brand-200">{payout.toLocaleString('fr-FR')} pts</span>}
          <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </div>
      </button>
    </div>
  )

  // ── Contenu du coupon ──
  const SlipContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-800/80 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-white">Mon coupon</span>
          {slip.length > 0 && (
            <span className="text-xs font-bold bg-brand-700 text-white rounded-full px-2 py-0.5">{slip.length}</span>
          )}
        </div>
        {slip.length > 0 && (
          <button onClick={onClear} className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Vider
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {slip.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-800 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">Clique sur une cote</p>
            <p className="text-xs text-gray-600 mt-1">pour l'ajouter au coupon</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {slip.map(s => (
              <div key={s.match_id} className="bg-gray-800/60 rounded-xl p-3 border border-gray-700/40">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-500 truncate">{s.home_team} - {s.away_team}</p>
                    <p className="text-xs font-bold text-white mt-0.5">{selLabel(s)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-black text-brand-400">x{s.odds_value.toFixed(2)}</span>
                    <button onClick={() => onRemove(s.match_id)} className="text-gray-600 hover:text-gray-400 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {slip.length > 0 && (
        <div className="shrink-0 border-t border-gray-800/80 p-3 space-y-3">
          {/* Cote totale */}
          <div className="flex items-center justify-between bg-gray-800/50 rounded-xl px-3 py-2">
            <span className="text-xs text-gray-500">Cote totale</span>
            <span className={`text-sm font-black tabular-nums ${isOverLimit ? 'text-red-400' : 'text-white'}`}>
              x {totalOdds.toFixed(2)}
              {isOverLimit && <span className="ml-1.5 text-[10px] font-normal text-red-400">(max x50)</span>}
            </span>
          </div>

          {/* Mise */}
          <div>
            <label className="block text-[11px] text-gray-500 mb-1.5 font-medium">Mise (pts)</label>
            <div className="relative">
              <input
                type="number" inputMode="numeric"
                value={stakeStr} onChange={e => setStakeStr(e.target.value)}
                placeholder="0" min={1} max={balance}
                className="w-full bg-gray-800 border border-gray-700 focus:border-brand-500 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors pr-10 tabular-nums"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600 pointer-events-none">pts</span>
            </div>
            {/* Raccourcis de mise */}
            <div className="flex gap-1.5 mt-2">
              {[100, 250, 500].map(v => (
                <button key={v} onClick={() => setStakeStr(String(Math.min(v, balance)))}
                  className="flex-1 text-[11px] font-medium py-1.5 rounded-lg bg-gray-800 border border-gray-700/60 text-gray-400 hover:border-brand-700 hover:text-brand-400 transition-colors">
                  {v}
                </button>
              ))}
              <button onClick={() => setStakeStr(String(balance))}
                className="flex-1 text-[11px] font-medium py-1.5 rounded-lg bg-gray-800 border border-gray-700/60 text-gray-400 hover:border-brand-700 hover:text-brand-400 transition-colors">
                Max
              </button>
            </div>
            {stake > balance && <p className="text-xs text-red-400 mt-1.5">Solde insuffisant</p>}
          </div>

          {/* Gain potentiel */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Gain potentiel</span>
            <span className={`text-base font-black tabular-nums ${payout > 0 ? 'text-brand-400' : 'text-gray-600'}`}>
              {payout > 0 ? payout.toLocaleString('fr-FR') : '—'} pts
            </span>
          </div>

          {/* Valider */}
          <button onClick={() => onConfirm(stake, () => setStakeStr(''))}
            disabled={!canSubmit}
            className="w-full bg-brand-600 hover:bg-brand-500 active:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-xl transition-colors text-sm">
            {isPlacing ? 'Validation...' : 'Valider le pari'}
          </button>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Mobile tab */}
      <MobileTab />

      {/* Mobile bottom sheet */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onToggleOpen} />
          <div className="relative bg-gray-900 border-t border-gray-800 rounded-t-3xl max-h-[80vh] flex flex-col">
            <div className="w-8 h-1 bg-gray-700 rounded-full mx-auto mt-3 mb-1 shrink-0" />
            <SlipContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col w-80 shrink-0">
        <div className="sticky top-20 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden max-h-[calc(100vh-6rem)] flex flex-col">
          <SlipContent />
        </div>
      </div>
    </>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl text-sm border shadow-xl whitespace-nowrap
      ${toast.type === 'success' ? 'bg-brand-950/90 border-brand-800/60 text-brand-300' : 'bg-red-950/90 border-red-800/60 text-red-300'}
    `}>{toast.msg}</div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function MatchesPage() {
  const { balance, refetchProfile } = useAuth()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState(null)
  const [isPlacing, setIsPlacing] = useState(false)
  const [slip, setSlip] = useState([])
  const [slipOpen, setSlipOpen] = useState(false)

  useEffect(() => { fetchMatches() }, [])

  async function fetchMatches() {
    const { data } = await supabase
      .from('matches').select('*, odds(*)')
      .eq('status', 'upcoming').order('start_time', { ascending: true })
    setMatches(data ?? [])
    setLoading(false)
  }

  async function syncMatches() {
    setSyncing(true)
    try {
      await supabase.functions.invoke('sync-matches')
      await fetchMatches()
      showToast('Matchs mis a jour', 'success')
    } catch { showToast('Erreur de synchronisation', 'error') }
    finally { setSyncing(false) }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  function toggleSelection(match, selection, oddsValue) {
    setSlip(prev => {
      const existingIdx = prev.findIndex(s => s.match_id === match.id && s.selection === selection)
      if (existingIdx !== -1) return prev.filter((_, i) => i !== existingIdx)
      const sameMatch = prev.findIndex(s => s.match_id === match.id)
      const entry = { match_id: match.id, home_team: match.home_team, away_team: match.away_team, market: 'h2h', selection, odds_value: oddsValue }
      if (sameMatch !== -1) { const u = [...prev]; u[sameMatch] = entry; return u }
      return [...prev, entry]
    })
    if (window.innerWidth < 768) setSlipOpen(true)
  }

  async function handleConfirm(stake, resetStake) {
    if (!stake || stake <= 0) return
    setIsPlacing(true)
    try {
      const { data, error } = await supabase.functions.invoke('place-bet', {
        body: { stake, selections: slip.map(s => ({ match_id: s.match_id, market: s.market, selection: s.selection, odds_value: s.odds_value })) }
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      setSlip([]); resetStake(); setSlipOpen(false)
      await refetchProfile()
      showToast(`Pari valide ! Gain potentiel : ${data.potential_payout?.toLocaleString('fr-FR')} pts`, 'success')
    } catch (err) { showToast(err.message || 'Erreur lors de la validation', 'error') }
    finally { setIsPlacing(false) }
  }

  const groups = useMemo(() => groupByDay(matches), [matches])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        Chargement...
      </div>
    </div>
  )

  return (
    <div className="flex gap-6 items-start">
      {/* Colonne principale */}
      <div className="flex-1 min-w-0 pb-28 md:pb-4">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Coupe du Monde 2026</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {matches.length > 0 ? `${matches.length} match${matches.length > 1 ? 's' : ''} a venir` : 'Aucun match charge'}
            </p>
          </div>
          <button onClick={syncMatches} disabled={syncing}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-400 transition-colors disabled:opacity-50 mt-1">
            <svg className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {syncing ? 'Sync...' : 'Actualiser'}
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 2a10 10 0 016.3 17.8"/>
              </svg>
            </div>
            <p className="text-white font-semibold text-lg">Aucun match disponible</p>
            <p className="text-gray-500 text-sm mt-2 mb-6">Charge les matchs de la Coupe du Monde.</p>
            <button onClick={syncMatches} disabled={syncing}
              className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm">
              {syncing ? 'Chargement...' : 'Charger les matchs'}
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
                    <MatchCard key={match.id} match={match} slip={slip} onToggle={toggleSelection} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Coupon (desktop sidebar / mobile bottom sheet) */}
      <BettingSlip
        slip={slip}
        onRemove={matchId => setSlip(prev => prev.filter(s => s.match_id !== matchId))}
        onClear={() => setSlip([])}
        balance={balance ?? 0}
        onConfirm={handleConfirm}
        isPlacing={isPlacing}
        isOpen={slipOpen}
        onToggleOpen={() => setSlipOpen(o => !o)}
      />

      <Toast toast={toast} />
    </div>
  )
}
