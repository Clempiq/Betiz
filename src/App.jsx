import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import MatchesPage from './pages/MatchesPage'
import BetsPage from './pages/BetsPage'
import LeaderboardPage from './pages/LeaderboardPage'
import ProfilePage from './pages/ProfilePage'

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="flex items-center gap-3 text-gray-600">
        <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Chargement</span>
      </div>
    </div>
  )
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  return user ? children : <Navigate to="/auth" replace />
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/matches" replace /> : <AuthPage />} />
      <Route path="/matches" element={<PrivateRoute><Layout><MatchesPage /></Layout></PrivateRoute>} />
      <Route path="/bets" element={<PrivateRoute><Layout><BetsPage /></Layout></PrivateRoute>} />
      <Route path="/leaderboard" element={<PrivateRoute><Layout><LeaderboardPage /></Layout></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Layout><ProfilePage /></Layout></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/matches" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
