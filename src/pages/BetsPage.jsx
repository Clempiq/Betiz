import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const STATUS_LABELS = { pending: 'En attente', won: 'Gagne', lost: 'Perdu' }
const STATUS_STYLES = {
  pending: 'bg-yellow-900/40 border-yellow-700/50 text-yellow-300',
  won:     'bg-brand-900/40 border-brand-700/50 text-brand-300',
  lost:    'bg-red-900/40 border-red-700/50 text-red-300',
}
const STATUS_DOT = {
  pending: 'bg-yellow-400',
  won:     'bg-brand-400',
  lost:    'bg-red-400',
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })
}

function SelectionRow({ sel }) {
  const isWon = sel.status === 'won'
  const isLost = sel.status === 'lost'
  const isPending = sel.status === 'pending'
  const winner = sel.matches?.result?.winner
  const homeScore = sel.matches?.result?.home_score
  const awayScore = sel.matches?.result?.away_score
  const hasResult = homeScore !== undefined && homeScore !== null

  function selLabel() {
    if (sel.selection === 'home') return sel.matches?.home_team ?? 'Domicile'
    if (sel.selection === 'away') return sel.matches?.away_team ?? 'Exterieur'
    return 'Match nul'
  }

  return (
    <div className={`flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm border transition-all
      ${isWon ? 'bg-brand-950/30 border-brand-800/30' : isLost ? 'bg-red-950/30 border-red-800/30' : 'bg-gray-800/30 border-gray-700/30'}
    `}>
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isWon ? 'bg-brand-400' : isLost ? 'bg-red-400' : 'bg-yellow-400'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-500 truncate">
          {sel.matches?.home_team} - {sel.matches?.away_team}
        </p>
        <p className={`text-xs font-semibold mt-0.5 ${isWon ? 'text-brand-300' : isLost ? 'text-red-300' : 'text-gray-200'}`}>
          {selLabel()}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-xs font-black tabular-nums ${isWon ? 'text-brand-400' : isLost ? 'text-red-400/60 line-through' : 'text-gray-400'}`}>
          x{parseFloat(sel.odds_value).toFixed(2)}
        </p>
        {hasResult && (
          <p className="text-[10px] text-gray-600 tabular-nums mt-0.5">
            {homeScore} - {awayScore}
          </p>
        )}
      </div>
    </div>
  )
}

function BetCard({ bet }) {
  const [expanded, setExpanded] = useState(false)
  const isCombo = bet.bet_selections?.length > 1
  const payout = bet.status === 'won' ? Math.floor(bet.stake * bet.total_odds) : 0

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all duration-200
      ${bet.status === 'won' ? 'border-brand-800/60 bg-gray-900' : bet.status === 'lost' ? 'border-red-900/40 bg-gray-900' : 'border-gray-800 bg-gray-900'}
    `}>
      {/* Header */}
      <button onClick={() => setExpanded(v => !v)} className="w-full text-left p-4">
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5
            ${bet.status === 'won' ? 'bg-brand-900/60 border-brand-700/50' : bet.status === 'lost' ? 'bg-red-900/40 border-red-800/40' : 'bg-gray-800 border-gray-700/50'}
          `}>
            {bet.status === 'won' && (
              <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {bet.status === 'lost' && (
              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {bet.status === 'pending' && (
              <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[bet.status]}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[bet.status]}`} />
                {STATUS_LABELS[bet.status]}
              </span>
              {isCombo && (
                <span className="text-[11px] font-medium text-purple-400 bg-purple-900/30 border border-purple-800/40 rounded-full px-2 py-0.5">
                  Combine {bet.bet_selections?.length} selec.
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="tabular-nums">{formatDate(bet.placed_at)}</span>
              {bet.settled_at && <span>· Regle {formatDate(bet.settled_at)}</span>}
            </div>
          </div>

          <div className="shrink-0 text-right">
            {bet.status === 'won' ? (
              <div>
                <p className="text-base font-black text-brand-400 tabular-nums">+{payout.toLocaleString('fr-FR')}</p>
                <p className="text-[10px] text-gray-600">points gagnes</p>
              </div>
            ) : bet.status === 'lost' ? (
              <div>
                <p className="text-sm font-black text-red-400/70 tabular-nums line-through">{bet.stake.toLocaleString('fr-FR')}</p>
                <p className="text-[10px] text-gray-600">points perdus</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-black text-gray-300 tabular-nums">{Math.floor(bet.stake * bet.total_odds).toLocaleString('fr-FR')}</p>
                <p className="text-[10px] text-gray-600">gain potentiel</p>
              </div>
            )}
          </div>
        </div>

        {/* Infos résumé */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-800/60">
          <div className="flex-1">
            <p className="text-[11px] text-gray-600 uppercase tracking-wide font-medium">Mise</p>
            <p className="text-sm font-bold text-white tabular-nums">{bet.stake.toLocaleString('fr-FR')} pts</p>
          </div>
          <div className="flex-1">
            <p className="text-[11px] text-gray-600 uppercase tracking-wide font-medium">Cote</p>
            <p className="text-sm font-bold text-white tabular-nums">x {parseFloat(bet.total_odds).toFixed(2)}</p>
          </div>
          <div className="flex-1">
            <p className="text-[11px] text-gray-600 uppercase tracking-wide font-medium">Selections</p>
            <p className="text-sm font-bold text-white">{bet.bet_selections?.length ?? 1}</p>
          </div>
          <div className="shrink-0">
            <svg className={`w-4 h-4 text-gray-600 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {/* Détail des sélections */}
      {expanded && bet.bet_selections?.length > 0 && (
        <div className="px-4 pb-4 space-y-1.5 border-t border-gray-800/60 pt-3">
          {bet.bet_selections.map(sel => (
            <SelectionRow key={sel.id} sel={sel} />
          ))}
        </div>
      )}
    </div>
  )
}

const FILTERS = [
  { key: 'all', label: 'Tous' },
  { key: 'pending', label: 'En attente' },
  { key: 'won', label: 'Gagnes' },
  { key: 'lost', label: 'Perdus' },
]

export default function BetsPage() {
  const { user } = useAuth()
  const [bets, setBets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (user) fetchBets()
  }, [user])

  async function fetchBets() {
    setLoading(true)
    const { data } = await supabase
      .from('bets')
      .select(`
        id, stake, total_odds, status, placed_at, settled_at,
        bet_selections (
          id, selection, odds_value, status,
          matches ( home_team, away_team, result )
        )
      `)
      .eq('user_id', user.id)
      .order('placed_at', { ascending: false })
    setBets(data ?? [])
    setLoading(false)
  }

  const filtered = filter === 'all' ? bets : bets.filter(b => b.status === filter)
  const counts = {
    all: bets.length,
    pending: bets.filter(b => b.status === 'pending').length,
    won: bets.filter(b => b.status === 'won').length,
    lost: bets.filter(b => b.status === 'lost').length,
  }
  const totalGain = bets.filter(b => b.status === 'won').reduce((a, b) => a + Math.floor(b.stake * b.total_odds), 0)
  const totalMise = bets.reduce((a, b) => a + (b.stake ?? 0), 0)
  const roi = totalMise > 0 ? Math.round(((totalGain - totalMise) / totalMise) * 100) : 0

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        Chargement...
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Mes paris</h1>
          <p className="text-sm text-gray-500 mt-0.5">{bets.length} pari{bets.length > 1 ? 's' : ''} au total</p>
        </div>
        <button onClick={fetchBets}
          className="text-xs text-gray-500 hover:text-brand-400 transition-colors flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualiser
        </button>
      </div>

      {/* Mini dashboard */}
      {bets.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 text-center">
            <p className="text-lg font-black text-white tabular-nums">{counts.won}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Gagnes</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 text-center">
            <p className={`text-lg font-black tabular-nums ${roi > 0 ? 'text-brand-400' : roi < 0 ? 'text-red-400' : 'text-gray-400'}`}>
              {roi > 0 ? '+' : ''}{roi}%
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">ROI</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 text-center">
            <p className="text-lg font-black text-brand-400 tabular-nums">{totalGain.toLocaleString('fr-FR')}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Pts gagnes</p>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border
              ${filter === f.key
                ? 'bg-brand-700 border-brand-600 text-white'
                : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200'
              }`}>
            {f.label}
            {counts[f.key] > 0 && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full
                ${filter === f.key ? 'bg-white/20 text-white' : 'bg-gray-800 text-gray-500'}`}>
                {counts[f.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-white font-semibold">Aucun pari {filter !== 'all' ? STATUS_LABELS[filter].toLowerCase() : ''}</p>
          <p className="text-gray-500 text-sm mt-1.5">
            {filter === 'all' ? 'Place ton premier pari sur les matchs !' : 'Change de filtre pour voir tes autres paris.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(bet => <BetCard key={bet.id} bet={bet} />)}
        </div>
      )}
    </div>
  )
}
