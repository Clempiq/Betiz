import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  // Client avec le JWT du joueur pour récupérer son identité
  const userSupabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
  )

  const { data: { user }, error: authError } = await userSupabase.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401 })
  }

  // Client admin pour toutes les écritures sensibles
  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const body = await req.json()
  const { stake, selections } = body

  if (!stake || stake <= 0 || !Number.isInteger(stake)) {
    return new Response(JSON.stringify({ error: 'Mise invalide' }), { status: 400 })
  }
  if (!selections || selections.length === 0) {
    return new Response(JSON.stringify({ error: 'Aucune sélection' }), { status: 400 })
  }

  const totalOdds = Math.round(selections.reduce((acc: number, s: any) => acc * s.odds_value, 1) * 100) / 100

  if (totalOdds > 50) {
    return new Response(JSON.stringify({ error: 'La cote totale dépasse ×50' }), { status: 400 })
  }

  const potentialPayout = Math.floor(stake * totalOdds)

  const { data: season } = await admin
    .from('seasons')
    .select('id')
    .eq('status', 'active')
    .single()

  if (!season) {
    return new Response(JSON.stringify({ error: 'Aucune saison active' }), { status: 400 })
  }

  const { data: balance } = await admin
    .from('balances')
    .select('points')
    .eq('user_id', user.id)
    .eq('season_id', season.id)
    .single()

  if (!balance || balance.points < stake) {
    return new Response(JSON.stringify({ error: 'Solde insuffisant' }), { status: 400 })
  }

  const { error: debitError } = await admin.rpc('increment_balance', {
    p_user_id: user.id,
    p_season_id: season.id,
    p_amount: -stake,
  })

  if (debitError) {
    return new Response(JSON.stringify({ error: 'Erreur lors du débit' }), { status: 500 })
  }

  const { data: bet, error: betError } = await admin
    .from('bets')
    .insert({
      user_id: user.id,
      season_id: season.id,
      stake,
      total_odds: totalOdds,
      potential_payout: potentialPayout,
      status: 'pending',
    })
    .select()
    .single()

  if (betError || !bet) {
    await admin.rpc('increment_balance', { p_user_id: user.id, p_season_id: season.id, p_amount: stake })
    return new Response(JSON.stringify({ error: 'Erreur création pari' }), { status: 500 })
  }

  const { error: selError } = await admin.from('bet_selections').insert(
    selections.map((s: any) => ({
      bet_id: bet.id,
      match_id: s.match_id,
      market: s.market,
      selection: s.selection,
      odds_value: s.odds_value,
      status: 'pending',
    }))
  )

  if (selError) {
    return new Response(JSON.stringify({ error: 'Erreur sélections' }), { status: 500 })
  }

  return new Response(
    JSON.stringify({ success: true, bet_id: bet.id, potential_payout: potentialPayout }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
