import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({ email:'', password:'', confirmPassword:'', username:'', dateOfBirth:'', ageConfirmed:false })

  // Detect reset token in URL hash (Supabase envoie #access_token=...)
  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('access_token') && hash.includes('type=recovery')) {
      setMode('reset')
    }
  }, [location])

  function set(field, value) { setForm(prev => ({ ...prev, [field]: value })); setError(''); setSuccess('') }

  function getAge(dateStr) {
    const birth = new Date(dateStr); const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  }

  async function handleRegister(e) {
    e.preventDefault(); setError('')
    const username = form.username.trim()
    if (!username) return setError('Choisis un pseudo.')
    if (username.length < 3) return setError('Pseudo trop court (3 caracteres min).')
    if (!/^[a-zA-Z0-9_\-]+$/.test(username)) return setError('Pseudo invalide (lettres, chiffres, _ et - uniquement).')
    if (!form.dateOfBirth) return setError('Date de naissance requise.')
    if (getAge(form.dateOfBirth) < 18) return setError('Tu dois avoir 18 ans ou plus pour jouer.')
    if (!form.ageConfirmed) return setError('Tu dois confirmer avoir 18 ans ou plus.')
    if (form.password.length < 6) return setError('Mot de passe trop court (6 caracteres min).')
    if (form.password !== form.confirmPassword) return setError('Les mots de passe ne correspondent pas.')
    setLoading(true)
    try {
      const { data: existing } = await supabase.from('profiles').select('id').ilike('username', username).maybeSingle()
      if (existing) { setError('Ce pseudo est deja pris.'); setLoading(false); return }
      const { error: signUpError } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: { data: { username, date_of_birth: form.dateOfBirth, age_confirmed: true } }
      })
      if (signUpError) {
        if (signUpError.message.includes('already registered')) throw new Error('Un compte existe deja avec cet email.')
        if (signUpError.message.includes('Database error')) throw new Error('Ce pseudo est deja utilise.')
        throw signUpError
      }
      setMode('verify')
    } catch (err) { setError(err.message || "Erreur lors de l'inscription.") }
    finally { setLoading(false) }
  }

  async function handleLogin(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
      if (loginError) {
        if (loginError.message.includes('Invalid login')) throw new Error('Email ou mot de passe incorrect.')
        if (loginError.message.includes('Email not confirmed')) throw new Error("Verifie ton email : un lien de confirmation t'a ete envoye.")
        throw loginError
      }
      navigate('/matches')
    } catch (err) { setError(err.message || 'Email ou mot de passe incorrect.') }
    finally { setLoading(false) }
  }

  async function handleForgot(e) {
    e.preventDefault(); setError(''); setSuccess(''); setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
        redirectTo: window.location.origin + '/auth',
      })
      if (error) throw error
      setSuccess('Email envoye ! Verifie ta boite de reception.')
    } catch (err) { setError(err.message || "Erreur lors de l'envoi.") }
    finally { setLoading(false) }
  }

  async function handleReset(e) {
    e.preventDefault(); setError('')
    if (form.password.length < 6) return setError('Mot de passe trop court (6 caracteres min).')
    if (form.password !== form.confirmPassword) return setError('Les mots de passe ne correspondent pas.')
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: form.password })
      if (error) throw error
      setSuccess('Mot de passe mis a jour ! Redirection...')
      setTimeout(() => navigate('/matches'), 1800)
    } catch (err) { setError(err.message || 'Erreur lors de la mise a jour.') }
    finally { setLoading(false) }
  }

  const inputCls = "w-full bg-gray-800 border border-gray-700/80 focus:border-brand-500 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors"

  // ── Mode Verification email ──
  if (mode === 'verify') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="bg-gray-900 rounded-2xl p-8 max-w-sm w-full text-center space-y-4 border border-gray-800">
        <div className="w-14 h-14 bg-brand-900/50 border border-brand-800/60 rounded-2xl flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white">Verifie ton email</h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          Lien envoye a <strong className="text-white">{form.email}</strong>. Clique dessus pour activer ton compte et recevoir tes <span className="text-brand-400 font-semibold">1 000 points</span>.
        </p>
        <button onClick={() => setMode('login')} className="text-brand-400 text-sm hover:underline">Retour a la connexion</button>
      </div>
    </div>
  )

  // ── Mode Reset password (depuis le lien email) ──
  if (mode === 'reset') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="bg-gray-900 rounded-2xl p-8 max-w-sm w-full space-y-6 border border-gray-800">
        <div className="text-center">
          <div className="w-12 h-12 bg-brand-900/50 border border-brand-800/60 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Bet<span className="text-brand-500">iz</span></h1>
          <p className="text-gray-400 text-sm mt-1">Nouveau mot de passe</p>
        </div>
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Nouveau mot de passe</label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
              placeholder="6 caracteres minimum" className={inputCls} required />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Confirmer</label>
            <input type="password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)}
              placeholder="Retape ton mot de passe" className={inputCls} required />
          </div>
          {error && <div className="text-red-300 text-sm bg-red-950/60 border border-red-800/60 rounded-xl px-3 py-2.5">{error}</div>}
          {success && <div className="text-brand-300 text-sm bg-brand-950/60 border border-brand-800/60 rounded-xl px-3 py-2.5">{success}</div>}
          <button type="submit" disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors text-sm">
            {loading ? 'Mise a jour...' : 'Enregistrer le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  )

  // ── Mode Forgot password ──
  if (mode === 'forgot') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="bg-gray-900 rounded-2xl p-8 max-w-sm w-full space-y-6 border border-gray-800">
        <div className="text-center">
          <h1 className="text-2xl font-black tracking-tight">Bet<span className="text-brand-500">iz</span></h1>
          <p className="text-gray-400 text-sm mt-1">Reinitialisation du mot de passe</p>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed">
          Saisis ton adresse email et on t'envoie un lien pour choisir un nouveau mot de passe.
        </p>
        <form onSubmit={handleForgot} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="tonemail@exemple.com" className={inputCls} required />
          </div>
          {error && <div className="text-red-300 text-sm bg-red-950/60 border border-red-800/60 rounded-xl px-3 py-2.5">{error}</div>}
          {success && <div className="text-brand-300 text-sm bg-brand-950/60 border border-brand-800/60 rounded-xl px-3 py-2.5">{success}</div>}
          <button type="submit" disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors text-sm">
            {loading ? 'Envoi...' : 'Envoyer le lien'}
          </button>
          <button type="button" onClick={() => { setMode('login'); setError(''); setSuccess('') }}
            className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Retour a la connexion
          </button>
        </form>
      </div>
    </div>
  )

  // ── Login / Register ──
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4 py-8">
      <div className="bg-gray-900 rounded-2xl p-8 max-w-sm w-full space-y-6 border border-gray-800">
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tight">Bet<span className="text-brand-500">iz</span></h1>
          <p className="text-gray-500 text-sm mt-1">Paris sportifs en points fictifs</p>
        </div>
        <div className="flex bg-gray-800/80 rounded-xl p-1 gap-1">
          {['login','register'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${mode===m ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}>
              {m === 'login' ? 'Connexion' : 'Inscription'}
            </button>
          ))}
        </div>
        <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Pseudo</label>
              <input type="text" value={form.username} onChange={e => set('username', e.target.value)}
                placeholder="Affiche dans le classement" maxLength={20} className={inputCls} required />
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="tonemail@exemple.com" className={inputCls} required />
          </div>
          <div>
            <label className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-400 font-medium">Mot de passe</span>
              {mode === 'login' && (
                <button type="button" onClick={() => { setMode('forgot'); setError(''); setSuccess('') }}
                  className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                  Mot de passe oublie ?
                </button>
              )}
            </label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
              placeholder="6 caracteres minimum" className={inputCls} required />
          </div>
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Confirmer le mot de passe</label>
                <input type="password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)}
                  placeholder="Retape ton mot de passe" className={inputCls} required />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Date de naissance</label>
                <input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)}
                  className={inputCls} required />
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={form.ageConfirmed} onChange={e => set('ageConfirmed', e.target.checked)} className="mt-0.5 accent-brand-500 shrink-0" />
                <span className="text-xs text-gray-400 leading-relaxed">
                  Je confirme avoir 18 ans ou plus et j'accepte les <span className="text-brand-400">CGU</span>.
                </span>
              </label>
            </>
          )}
          {error && <div className="text-red-300 text-sm bg-red-950/60 border border-red-800/60 rounded-xl px-3 py-2.5">{error}</div>}
          {success && <div className="text-brand-300 text-sm bg-brand-950/60 border border-brand-800/60 rounded-xl px-3 py-2.5">{success}</div>}
          <button type="submit" disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-500 active:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors text-sm">
            {loading ? 'Chargement...' : mode === 'login' ? 'Se connecter' : 'Creer mon compte'}
          </button>
          {mode === 'register' && (
            <p className="text-[11px] text-gray-600 text-center leading-relaxed">
              Aucun argent reel. Points fictifs uniquement. Reserve aux +18 ans.
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
