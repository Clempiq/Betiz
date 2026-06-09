import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const NAV = [
  { to: '/matches',     label: 'Matchs',    icon: 'ball'   },
  { to: '/bets',        label: 'Paris',     icon: 'ticket' },
  { to: '/leaderboard', label: 'Classement',icon: 'trophy' },
  { to: '/profile',     label: 'Profil',    icon: 'user'   },
]

function NavIcon({ name, className = 'w-5 h-5' }) {
  if (name === 'ball') return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2a10 10 0 0 1 6.3 17.8M12 2a10 10 0 0 0-6.3 17.8M12 22a10 10 0 0 0 6.3-17.8M12 22a10 10 0 0 1-6.3-17.8M2.5 9h19M2.5 15h19" strokeLinecap="round"/>
    </svg>
  )
  if (name === 'ticket') return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M15 5H9a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z"/>
      <path d="M9 9h6M9 12h6M9 15h4" strokeLinecap="round"/>
    </svg>
  )
  if (name === 'trophy') return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M8 21h8M12 17v4M7 4H5a2 2 0 0 0-2 2v2a4 4 0 0 0 4 4h10a4 4 0 0 0 4-4V6a2 2 0 0 0-2-2h-2M7 4V2h10v2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
  if (name === 'user') return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round"/>
    </svg>
  )
  return null
}

export default function Layout({ children }) {
  const { profile, balance } = useAuth()
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen flex flex-col bg-gray-950">
      <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800/80 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link to="/matches" className="font-black text-xl text-white tracking-tight shrink-0">
            Bet<span className="text-brand-500">iz</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1 flex-1 justify-center">
            {NAV.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === to
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-gray-800/80 border border-gray-700/60 rounded-full px-3 py-1.5">
              <span className="text-brand-400 font-black text-sm tabular-nums">
                {(balance ?? 0).toLocaleString('fr-FR')}
              </span>
              <span className="text-gray-500 text-xs">pts</span>
            </div>
            <Link
              to="/profile"
              title="Mon profil"
              className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold transition-colors ${
                pathname === '/profile'
                  ? 'bg-brand-800 border-brand-600 text-brand-200'
                  : 'bg-gray-800 border-gray-700/60 text-gray-400 hover:text-white hover:border-gray-600'
              }`}
            >
              {profile?.username?.[0]?.toUpperCase() ?? '?'}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-5">
        {children}
      </main>

      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800/80">
        <div className="flex">
          {NAV.map(({ to, label, icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                pathname === to ? 'text-brand-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <NavIcon name={icon} className="w-5 h-5" />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <div className="sm:hidden h-16" />
    </div>
  )
}
