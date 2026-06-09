import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [balance, setBalance] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Récupère la session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    // Écoute les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else {
        setProfile(null)
        setBalance(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      setProfile(profileData)

      // Récupère le solde de la saison active
      const { data: seasonData } = await supabase
        .from('seasons')
        .select('id')
        .eq('status', 'active')
        .single()

      if (seasonData) {
        const { data: balanceData } = await supabase
          .from('balances')
          .select('points')
          .eq('user_id', userId)
          .eq('season_id', seasonData.id)
          .single()

        setBalance(balanceData?.points ?? 0)
      }
    } catch (err) {
      console.error('Erreur fetchProfile:', err)
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const value = { user, profile, balance, loading, signOut, refetchProfile: () => user && fetchProfile(user.id) }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider')
  return ctx
}
