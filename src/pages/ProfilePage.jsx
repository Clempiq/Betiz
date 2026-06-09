import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent = false }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col gap-1">
      <p className="text-[11px] text-gray-500 uppercase tracking-wide font-medium">{label}</p>
      <p className={`text-2xl font-black tabular-nums ${accent ? 'text-brand-400' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-600">{sub}</p>}
    </div>
  )
}

// ─── Bouton pub simulée ──────────────────────────────────────────────────────

function AdRewardButton({ onEarned }) {
  const [state, setState] = useState('idle') // idle | watching | cooldown
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [toast, setToast] = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleWatch() {
    if (state !== 'idle') return
    setState('watching')
    setSecondsLeft(5)

    // Compte à rebours 5 secondes (simule la pub)
    let t = 5
    const interval = setInterval(() => {
      t--
      setSecondsLeft(t)
      if (t <= 0) clearInterval(interval)
    }, 1000)

    await new Promise(r => setTimeout(r, 5000))

    try {
      const { data: season } = await supabase
        .from('seasons')
        .select('id')
        .eq('status', 'active')
        .single()

      if (!season) throw new Error('Pas de saison active')

      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase.rpc('increment_balance', {
        p_user_id: user.id,
        p_season_id: season.id,
        p_amount: 100,
      })

      if (error) throw error

      onEarned(100)
      showToast('🎁 +100 points reçus !', 'success')
    } catch (err) {
      showToast('Erreur : ' + (err.message ?? 'impossible de créditer'), 'error')
    }

    // Cooldown 5 min
    setState('cooldown')
    let cd = 300
    setSecondsLeft(cd)
    const cd_interval = setInterval(() => {
      cd--
      setSecondsLeft(cd)
      if (cd <= 0) {
        clearInterval(cd_interval)
        setState('idle')
      }
    }, 1000)
  }

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-bold text-white mb-0.5">Regarder une publicité</p>
          <p className="text-xs text-gray-500">Gagne 100 points gratuits toutes les 5 minutes</p>
          {toast && (
            <p className={`text-xs mt-2 ${toast.type === 'success' ? 'text-brand-400' : 'text-red-400'}`}>
              {toast.msg}
            </p>
          )}
        </div>

        <button
          onClick={handleWatch}
          disabled={state !== 'idle'}
          className={`shrink-0 px-4 py-2.5 rounded-xl font-bold text-sm transition-all
            ${state === 'idle'
              ? 'bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white'
              : state === 'watching'
                ? 'bg-gray-800 text-gray-400 border border-gray-700 cursor-wait'
                : 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
            }
          `}
        >
          {state === 'idle' && '+100 pts'}
          {state === 'watching' && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-brand-500 animate-pulse" />
              {secondsLeft}s
            </span>
          )}
          {state === 'cooldown' && `${mins}:${String(secs).padStart(2, '0')}`}
        </button>
      </div>
    </div>
  )
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, profile, balance, signOut, refetchProfile } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    if (user) fetchStats()
  }, [user])

  async function fetchStats() {
    setLoadingStats(true)
    try {
      const { data: bets } = await supabase
        .from('bets')
        .select('status, stake, total_odds, potential_payout, settled_at')
        .eq('user_id', user.id)

      const total = bets?.length ?? 0
      const won = bets?.filter(b => b.status === 'won').length ?? 0
      const lost = bets?.filter(b => b.status === 'lost').length ?? 0
      const pending = bets?.filter(b => b.status === 'pending').length ?? 0
      const totalStaked = bets?.reduce((a, b) => a + (b.stake ?? 0), 0) ?? 0
      const totalWon = bets
        ?.filter(b => b.status === 'won')
        .reduce((a, b) => a + (b.potential_payout ?? 0), 0) ?? 0

      const roi = totalStaked > 0
        ? Math.round(((totalWon - totalStaked) / totalStaked) * 100)
        : 0

      const bestBet = bets
        ?.filter(b => b.status === 'won')
        .sort((a, b) => b.potential_payout - a.potential_payout)[0]

      setStats({ total, won, lost, pending, totalStaked, totalWon, roi, bestBet })
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingStats(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/auth')
  }

  const winRate = stats?.total > 0 && (stats.won + stats.lost) > 0
    ? Math.round((stats.won / (stats.won + stats.lost)) * 100)
    : null

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-6">

      {/* Avatar + nom */}
      <div className="flex items-center gap-4 py-2">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 border border-brand-800/60 flex items-center justify-center text-2xl font-black text-white shrink-0">
          {profile?.username?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black text-white truncate">
            {profile?.username ?? 'Joueur'}
          </h1>
          <p className="text-sm text-gray-500 truncate">{user?.email}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span className="text-xs text-brand-400 font-medium">Saison active</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] text-gray-600 uppercase tracking-wide">Solde</p>
          <p className="text-xl font-black text-brand-400 tabular-nums">
            {(balance ?? 0).toLocaleString('fr-FR')}
          </p>
          <p className="text-xs text-gray-600">points</p>
        </div>
      </div>

      {/* Stats */}
      <section>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 px-0.5">
          Statistiques de la saison
        </h2>
        {loadingStats ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 h-20 animate-pulse" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Paris joués"
              value={stats.total}
              sub={`${stats.pending} en attente`}
            />
            <StatCard
              label="Taux de victoire"
              value={winRate !== null ? `${winRate}%` : '—'}
              sub={`${stats.won}V / ${stats.lost}D`}
              accent={winRate !== null && winRate >= 50}
            />
            <StatCard
              label="Points misés"
              value={(stats.totalStaked).toLocaleString('fr-FR')}
              sub="cette saison"
            />
            <StatCard
              label="ROI"
              value={stats.total > 0 ? `${stats.roi > 0 ? '+' : ''}${stats.roi}%` : '—'}
              sub="retour sur mise"
              accent={stats.roi > 0}
            />
          </div>
        ) : (
          <p className="text-sm text-gray-600 text-center py-4">Impossible de charger les stats</p>
        )}

        {stats?.bestBet && (
          <div className="mt-3 bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <p className="text-[11px] text-gray-500 uppercase tracking-wide font-medium mb-1">🏆 Meilleur gain</p>
            <p className="text-lg font-black text-brand-400 tabular-nums">
              {stats.bestBet.potential_payout.toLocaleString('fr-FR')} pts
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              Cote × {stats.bestBet.total_odds.toFixed(2)} · Mise {stats.bestBet.stake.toLocaleString('fr-FR')} pts
            </p>
          </div>
        )}
      </section>

      {/* Pub récompensée */}
      <section>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 px-0.5">
          Points gratuits
        </h2>
        <AdRewardButton onEarned={() => refetchProfile()} />
        <p className="text-[11px] text-gray-600 mt-2 px-1">
          Des publicités partenaires remplacent ce bouton en production pour financer les récompenses.
        </p>
      </section>

      {/* Infos légales & déconnexion */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 px-0.5">
          Compte
        </h2>

        <button
          onClick={handleSignOut}
          className="w-full bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl px-4 py-3.5 text-sm text-red-400 font-medium text-left flex items-center gap-3 transition-colors"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
          </svg>
          Se déconnecter
        </button>
      </section>

      {/* Legal */}
      <div className="border-t border-gray-800/60 pt-4">
        <p className="text-[11px] text-gray-700 leading-relaxed">
          Betiz est une plateforme de paris sportifs fictifs utilisant exclusivement des points virtuels sans valeur monétaire.
          Aucun argent réel n'est misé ou gagné. Réservé aux joueurs de 18 ans et plus.
          Les récompenses (cartes-cadeaux) sont attribuées aux meilleurs joueurs du classement mensuel.
          En jouant, vous acceptez nos conditions d'utilisation.
        </p>
        <p className="text-[10px] text-gray-800 mt-2">betiz.app · v0.1.0 · © 2026</p>
      </div>
    </div>
  )
}
