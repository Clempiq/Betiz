import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const MEDALS = ['🥇', '🥈', '🥉']

function PodiumCard({ row, isMe }) {
  const medal = MEDALS[row.rank - 1]
  const sizes = { 1: 'py-6', 2: 'py-4', 3: 'py-3' }
  const textSizes = { 1: 'text-2xl', 2: 'text-xl', 3: 'text-lg' }

  return (
    <div className={`
      flex flex-col items-center bg-gray-900 rounded-2xl border px-3 ${sizes[row.rank]} flex-1
      transition-all
      ${isMe
        ? 'border-brand-700/60 shadow-lg shadow-brand-950/40 ring-1 ring-brand-800/40'
        : row.rank === 1
          ? 'border-yellow-700/40 shadow-md shadow-yellow-950/20'
          : 'border-gray-800/60'
      }
    `}>
      <span className="text-2xl mb-2">{medal}</span>
      <p className={`font-bold text-white text-center leading-tight ${textSizes[row.rank]}`}>
        {row.username}
        {isMe && <span className="block text-[10px] text-brand-400 font-normal mt-0.5">toi</span>}
      </p>
      <p className={`mt-2 font-black tabular-nums ${row.rank === 1 ? 'text-yellow-400' : 'text-brand-400'}`}>
        {parseInt(row.points).toLocaleString('fr-FR')}
      </p>
      <p className="text-[10px] text-gray-600 mt-0.5">pts</p>
    </div>
  )
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()

    const channel = supabase
      .channel('leaderboard-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'balances' }, fetchLeaderboard)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchLeaderboard() {
    const { data } = await supabase
      .from('leaderboard')
      .select('*')
      .order('rank', { ascending: true })
      .limit(100)
    setRows(data ?? [])
    setLoading(false)
  }

  const myRow = rows.find(r => r.user_id === user?.id)
  const podium = rows.filter(r => r.rank <= 3)
  const rest = rows.filter(r => r.rank > 3)

  // Ré-ordonner le podium visuellement : 2 - 1 - 3
  const podiumDisplay = podium.length === 3
    ? [podium[1], podium[0], podium[2]]
    : podium

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
      <span className="animate-spin mr-2 text-brand-500">⟳</span> Chargement…
    </div>
  )

  if (rows.length === 0) return (
    <div className="text-center py-24">
      <div className="text-6xl mb-4">🏆</div>
      <p className="text-white font-semibold text-lg">Classement vide</p>
      <p className="text-gray-500 text-sm mt-2">Sois le premier à placer un pari !</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Classement</h1>
          <p className="text-sm text-gray-500 mt-0.5">Juin 2026 · Coupe du Monde</p>
        </div>
        <span className="text-xs text-gray-600 bg-gray-900 border border-gray-800 rounded-full px-3 py-1">
          {rows.length} joueur{rows.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Ma position si hors top 3 */}
      {myRow && myRow.rank > 3 && (
        <div className="bg-brand-950/40 border border-brand-800/40 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-brand-400 font-medium">Ta position</p>
            <p className="text-sm font-bold text-white">#{myRow.rank} — {myRow.username}</p>
          </div>
          <p className="text-brand-400 font-bold tabular-nums">{parseInt(myRow.points).toLocaleString('fr-FR')} pts</p>
        </div>
      )}

      {/* Podium */}
      {podiumDisplay.length > 0 && (
        <div className="flex items-end gap-2">
          {podiumDisplay.map(row => (
            <PodiumCard key={row.user_id} row={row} isMe={row.user_id === user?.id} />
          ))}
        </div>
      )}

      {/* Reste du classement */}
      {rest.length > 0 && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800/80">
                <th className="text-left px-4 py-3 text-xs text-gray-600 font-semibold uppercase tracking-wide w-10">#</th>
                <th className="text-left px-4 py-3 text-xs text-gray-600 font-semibold uppercase tracking-wide">Joueur</th>
                <th className="text-right px-4 py-3 text-xs text-gray-600 font-semibold uppercase tracking-wide">Points</th>
              </tr>
            </thead>
            <tbody>
              {rest.map((row) => {
                const isMe = row.user_id === user?.id
                return (
                  <tr
                    key={row.user_id}
                    className={`border-b border-gray-800/40 last:border-0 transition-colors ${
                      isMe ? 'bg-brand-950/30' : 'hover:bg-gray-800/30'
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-500 tabular-nums font-medium">{row.rank}</td>
                    <td className="px-4 py-3 font-medium text-white">
                      {row.username}
                      {isMe && <span className="ml-2 text-[10px] text-brand-400 font-normal">toi</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-brand-400 tabular-nums">
                      {parseInt(row.points).toLocaleString('fr-FR')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
