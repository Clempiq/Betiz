import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'verify'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    email: '',
    password: '',
    username: '',
    dateOfBirth: '',
    ageConfirmed: false,
  })

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  function getAge(dateStr) {
    const birth = new Date(dateStr)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError('')

    if (!form.username.trim()) return setError('Choisis un pseudo.')
    if (form.username.length < 3) return setError('Pseudo trop court (3 caractères min).')
    if (!form.dateOfBirth) return setError('Date de naissance requise.')
    if (getAge(form.dateOfBirth) < 18) return setError('Tu dois avoir 18 ans ou plus pour jouer.')
    if (!form.ageConfirmed) return setError('Tu dois confirmer avoir 18 ans ou plus.')
    if (form.password.length < 6) return setError('Mot de passe trop court (6 caractères min).')

    setLoading(true)
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            username: form.username.trim(),
            date_of_birth: form.dateOfBirth,
            age_confirmed: true,
          },
        },
      })

      if (signUpError) throw signUpError
      setMode('verify')
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'inscription.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })
      if (loginError) throw loginError
      navigate('/matches')
    } catch (err) {
      setError(err.message || 'Email ou mot de passe incorrect.')
    } finally {
      setLoading(false)
    }
  }

  if (mode === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
        <div className="bg-gray-900 rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
          <div className="text-4xl">📬</div>
          <h2 className="text-xl font-bold">Vérifie ton email</h2>
          <p className="text-gray-400 text-sm">
            On a envoyé un lien de confirmation à <strong>{form.email}</strong>.
            Clique dessus pour activer ton compte et recevoir tes 1000 points.
          </p>
          <button
            onClick={() => setMode('login')}
            className="text-brand-400 text-sm hover:underline"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="bg-gray-900 rounded-2xl p-8 max-w-sm w-full space-y-6">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-brand-500">Betiz</h1>
          <p className="text-gray-400 text-sm mt-1">Paris sportifs en points fictifs</p>
        </div>

        {/* Onglets */}
        <div className="flex bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === 'login' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Connexion
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === 'register' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Inscription
          </button>
        </div>

        <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Pseudo</label>
              <input
                type="text"
                value={form.username}
                onChange={e => set('username', e.target.value)}
                placeholder="Ton pseudo affiché dans le classement"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="tonemail@exemple.com"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Mot de passe</label>
            <input
              type="password"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              placeholder="6 caractères minimum"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
              required
            />
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Date de naissance</label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={e => set('dateOfBirth', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                  required
                />
              </div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.ageConfirmed}
                  onChange={e => set('ageConfirmed', e.target.checked)}
                  className="mt-0.5 accent-brand-500"
                />
                <span className="text-sm text-gray-400">
                  Je confirme avoir 18 ans ou plus et accepte les{' '}
                  <a href="/cgu" className="text-brand-400 hover:underline">CGU</a>.
                </span>
              </label>
            </>
          )}

          {error && (
            <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Chargement…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>
      </div>
    </div>
  )
}
