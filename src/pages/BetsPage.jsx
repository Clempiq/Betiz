import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const STATUS = {
  pending: { label: 'En attente', dot: 'bg-yellow-400', text: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-800/40' },
  won:     { label: 'Gagné 🎉',   dot: 'bg-brand-400',  text: 'text-brand-400',  bg: 'bg-brand-900/20 border-brand-800/40' },
  lost:    { label: 'Perdu',      dot: 'bg-red-400',    text: 'text-red-400',    bg: 'bg-red-900/10 border-red-900/30' },
  void:    { label: 'Annulé',     dot: 'bg-gray-500',   text: 'text-gray-500',   bg: 'bg-gray-800/30 border-gray-700/30' },
}

function formatDate(str) {
  return new Date(str).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function SelectionRow({ sel }) {
  const statusColor = {
    pending: 'text-gray-500',
    won: 'text-brand-400',
    lost: 'text-red-400',
    void: 'text-gray-600',
  }[sel.status] || 'text-gray-500'

  const selLabel = sel.selection === 'home'
    ? sel.matches?.home_team
    : sel.selection === 'away'
      ? sel.matches?.away_team
      : 'Match nul'

  return (
    <div className="flex items-center justify-between text-xs py-1">
      <div className="flex-1 min-w-0">
        <span className="text-gray-400 truncate block">
          {sel.matches?.home_team} - {sel.matches?.away_team}
        </span>
        <span className="text-white font-medium">{selLabel}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <span className="text-gray-500 tabular-nums">× {sel.odds_value}</span>
        <span className={`font-semibold ${statusColor}`}>
          {sel.status === 'won' ? '✓' : sel.status === 'lost' ? '✗' : '·'}
        </span>
      </div>
    </div>
  )
}

function BetCard({ bet }) {
  const [expanded, setExpanded] = useState(false)
  const s = STATUS[bet.status] ?? STATUS.pending
  const isCombo = bet.bet_selections?.length > 1

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${s.bg}`}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-4 py-3.5 text-left"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
            <div className="min-w-0">
              {isCombo ? (
                <p className="text-sm font-semibold text-white">
                  Combiné · {bet.bet_selections.length} sélections
                </p>
              ) : (
                <p className="text-sm font-semibold text-white truncate">
                  {bet.bet_selections?.[0]?.matches?.home_team} - {bet.bet_selections?.[0]?.matches?.away_team}
                </p>
              )}
              <p className="text-xs text-gray-500">{formatDate(bet.placed_at)}</p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className={`text-xs font-semibold ${s.text}`}>{s.label}</p>
            <p className="text-xs text-gray-500 tabular-nums">× {parseFloat(bet.total_odds).toFixed(2)}</p>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5">
          <div className="pt-3 space-y-0.5 divide-y divide-gray-800/60">
            {bet.bet_selections?.map(sel => (
              <SelectionRow key={sel.id} sel={sel} />
            ))}
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-white/5">
            <div>
              <p className="text-xs text-gray-500">Mise</p>
              <p className="text-sm font-bold text-white tabular-nums">{bet.stake.toLocaleString('fr-FR')} pts</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">
                {bet.status === 'won' ? 'Gain encaissé' : 'Gain potentiel'}
              </p>
              <p className={`text-sm font-bold tabular-nums ${bet.status === 'won' ? 'text-brand-400' : 'text-gray-400'}`}>
                {bet.potential_payout.toLocaleString('fr-FR')} pts
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BetsPage() {
  const { user } = useAuth()
  const [bets, setBets] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pending') // 'pending' | 'settled'

  useEffect(() => { if (user) fetchBets() }, [user])

  async function fetchBets() {
    const { data } = await supabase
      .from('bets')
      .select('*, bet_selections(*, matches(home_team, away_team, start_time))')
      .eq('user_id', user.id)
      .order('placed_at', { ascending: false })
    setBets(data ?? [])
    setLoading(false)
  }

  const pending = bets.filter(b => b.status === 'pending')
  const settled = bets.filter(b => b.status !== 'pending')
  const shown = tab === 'pending' ? pending : settled

  const stats = {
    total: bets.length,
    won: bets.filter(b => b.status === 'won').length,
    totalWon: bets.filter(b => b.status === 'won').reduce((a, b) => a + b.potential_payout, 0),
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
      <span className="animate-spin mr-2 text-brand-500">⟳</span> Chargement…
    </div>
  )

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Mes paris</h1>

      {/* Stats rapides */}
      {bets.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: stats.total },
            { label: 'Gagnés', value: stats.won, highlight: stats.won > 0 },
            { label: 'Pts gagnés', value: stats.totalWon.toLocaleString('fr-FR'), highlight: stats.totalWon > 0 },
          ].map(stat => (
            <div key={stat.label} className="bg-gray-900 rounded-xl px-3 py-3 text-center border border-gray-800/60">
              <p className={`text-lg font-bold tabular-nums ${stat.highlight ? 'text-brand-400' : 'text-white'}`}>{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-gray-900 border border-gray-800/60 rounded-xl p-1">
        {[
          { key: 'pending', label: `En attente${pending.length > 0 ? ` (${pending.length})` : ''}` },
          { key: 'settled', label: `Terminés${settled.length > 0 ? ` (${settled.length})` : ''}` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === t.key ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {shown.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">{tab === 'pending' ? '🎫' : '📋'}</div>
          <p className="text-gray-400 font-medium">
            {tab === 'pending' ? 'Aucun pari en attente' : 'Aucun pari terminé'}
          </p>
          {tab === 'pending' && (
            <p className="text-gray-600 text-sm mt-1">Va dans les matchs pour placer ton premier pari.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {shown.map(bet => <BetCard key={bet.id} bet={bet} />)}
        </div>
      )}
    </div>
  )
}
