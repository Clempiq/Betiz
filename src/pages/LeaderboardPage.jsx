import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function RankBadge({ rank }) {
  if (rank === 1) return (
    <div className="w-8 h-8 rounded-xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center shrink-0">
      <span className="text-sm">🥇</span>
    </div>
  )
  if (rank === 2) return (
    <div className="w-8 h-8 rounded-xl bg-gray-400/20 border border-gray-400/40 flex items-center justify-center shrink-0">
      <span className="text-sm">🥈</span>
    </div>
  )
  if (rank === 3) return (
    <div className="w-8 h-8 rounded-xl bg-amber-700/20 border border-amber-700/40 flex items-center justify-center shrink-0">
      <span className="text-sm">🥉</span>
    </div>
  )
  return (
    <div className="w-8 h-8 rounded-xl bg-gray-800 border border-gray-700/50 flex items-center justify-center shrink-0">
      <span className="text-xs font-black text-gray-500 tabular-nums">{rank}</span>
    </div>
  )
}

function Podium({ top3 }) {
  if (top3.length === 0) return null
  const [first, second, third] = top3

  return (
    <div className="relative flex items-end justify-center gap-2 h-44 px-4 mb-8">
      {/* 2nd */}
      {second && (
        <div className="flex-1 flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 border-2 border-gray-400/40 flex items-center justify-center text-base font-black text-white mb-2 shadow-lg">
            {second.username?.[0]?.toUpperCase() ?? '?'}
          </div>
          <p className="text-xs font-bold text-gray-300 truncate max-w-full text-center mb-2">{second.username}</p>
          <div className="w-full h-24 bg-gradient-to-t from-gray-500/20 to-gray-400/10 border border-gray-400/20 rounded-t-xl flex flex-col items-center justify-end pb-3">
            <p className="text-sm font-black text-gray-300 tabular-nums">{second.balance?.toLocaleString('fr-FR')}</p>
            <p className="text-[10px] text-gray-500">pts</p>
          </div>
        </div>
      )}

      {/* 1st */}
      {first && (
        <div className="flex-1 flex flex-col items-center">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 border-2 border-yellow-400/60 flex items-center justify-center text-lg font-black text-white mb-2 shadow-lg shadow-yellow-500/20">
              {first.username?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="absolute -top-1.5 -right-1.5 text-base">👑</div>
          </div>
          <p className="text-xs font-bold text-yellow-300 truncate max-w-full text-center mb-2">{first.username}</p>
          <div className="w-full h-36 bg-gradient-to-t from-yellow-500/20 to-yellow-400/10 border border-yellow-500/30 rounded-t-xl flex flex-col items-center justify-end pb-3">
            <p className="text-base font-black text-yellow-300 tabular-nums">{first.balance?.toLocaleString('fr-FR')}</p>
            <p className="text-[10px] text-yellow-500/70">pts</p>
          </div>
        </div>
      )}

      {/* 3rd */}
      {third && (
        <div className="flex-1 flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-700 to-amber-900 border-2 border-amber-700/40 flex items-center justify-center text-base font-black text-white mb-2 shadow-lg">
            {third.username?.[0]?.toUpperCase() ?? '?'}
          </div>
          <p className="text-xs font-bold text-amber-700 truncate max-w-full text-center mb-2">{third.username}</p>
          <div className="w-full h-16 bg-gradient-to-t from-amber-700/20 to-amber-600/10 border border-amber-700/20 rounded-t-xl flex flex-col items-center justify-end pb-3">
            <p className="text-sm font-black text-amber-600 tabular-nums">{third.balance?.toLocaleString('fr-FR')}</p>
            <p className="text-[10px] text-amber-700/70">pts</p>
          </div>
        </div>
      )}
    </div>
  )
}

function LeaderRow({ entry, rank, isMe }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all
      ${isMe ? 'bg-brand-950/50 border-brand-800/60' : 'bg-gray-900 border-gray-800/60 hover:border-gray-700/60'}
    `}>
      <RankBadge rank={rank} />
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-700 to-brand-900 border border-brand-800/50 flex items-center justify-center text-sm font-black text-white shrink-0">
        {entry.username?.[0]?.toUpperCase() ?? '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm truncate ${isMe ? 'text-brand-300' : 'text-white'}`}>
          {entry.username}
          {isMe && <span className="ml-2 text-[10px] text-brand-500 font-medium">(moi)</span>}
        </p>
        <p className="text-[11px] text-gray-500 mt-0.5 tabular-nums">
          {entry.bets_won ?? 0}V / {entry.bets_played ?? 0} joues
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`font-black tabular-nums text-base ${isMe ? 'text-brand-400' : rank <= 3 ? 'text-white' : 'text-gray-300'}`}>
          {(entry.balance ?? 0).toLocaleString('fr-FR')}
        </p>
        <p className="text-[10px] text-gray-600">pts</p>
      </div>
    </div>
  )
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [myRank, setMyRank] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    fetchLeaderboard()

    // Realtime subscription sur les balances
    const channel = supabase
      .channel('leaderboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'balances' }, () => {
        fetchLeaderboard()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchLeaderboard() {
    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .eq('status', 'active')
      .single()

    if (!season) { setLoading(false); return }

    const { data } = await supabase
      .from('balances')
      .select('user_id, balance, profiles(username)')
      .eq('season_id', season.id)
      .order('balance', { ascending: false })
      .limit(50)

    const enriched = (data ?? []).map((row, i) => ({
      user_id: row.user_id,
      username: row.profiles?.username ?? 'Anonyme',
      balance: row.balance,
      rank: i + 1,
    }))

    setEntries(enriched)
    setLastUpdate(new Date())

    const myEntry = enriched.find(e => e.user_id === user?.id)
    if (myEntry) setMyRank(myEntry.rank)

    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        Chargement...
      </div>
    </div>
  )

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)

  return (
    <div className="max-w-2xl mx-auto pb-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Classement</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {entries.length} joueur{entries.length > 1 ? 's' : ''} cette saison
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
          Temps reel
        </div>
      </div>

      {/* Ma position */}
      {myRank && myRank > 3 && (
        <div className="mb-4 bg-brand-950/40 border border-brand-800/40 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-brand-300">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Ma position</span>
          </div>
          <span className="font-black text-white tabular-nums">#{myRank}</span>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-white font-semibold text-lg">Classement vide</p>
          <p className="text-gray-500 text-sm mt-2">Sois le premier a parier !</p>
        </div>
      ) : (
        <>
          {/* Podium */}
          <Podium top3={top3} />

          {/* Suite du classement */}
          {rest.length > 0 && (
            <div className="space-y-2">
              {rest.map(entry => (
                <LeaderRow key={entry.user_id} entry={entry} rank={entry.rank} isMe={entry.user_id === user?.id} />
              ))}
            </div>
          )}

          {/* Top 3 en liste sous le podium (mobile friendly) */}
          <div className="mt-4 space-y-2">
            {top3.map(entry => (
              <LeaderRow key={entry.user_id} entry={entry} rank={entry.rank} isMe={entry.user_id === user?.id} />
            ))}
          </div>
        </>
      )}

      {lastUpdate && (
        <p className="text-[11px] text-gray-700 text-center mt-6">
          Mis a jour a {lastUpdate.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
        </p>
      )}
    </div>
  )
}
