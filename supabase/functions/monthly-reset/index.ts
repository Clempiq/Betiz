import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get('Authorization')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const isInternal = req.headers.get('x-internal-cron') === 'true'
  const isBearerValid = authHeader === `Bearer ${serviceKey}`

  if (!isInternal && !isBearerValid) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    serviceKey
  )

  const { data: currentSeason } = await supabase
    .from('seasons')
    .select('*')
    .eq('status', 'active')
    .single()

  if (!currentSeason) {
    return new Response(JSON.stringify({ error: 'Aucune saison active' }), { status: 400 })
  }

  // Clôture la saison actuelle
  await supabase.from('seasons').update({ status: 'closed' }).eq('id', currentSeason.id)

  // Crée la nouvelle saison (mois suivant)
  const currentMonth = new Date(currentSeason.month)
  const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
  const nextMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 2, 0, 23, 59, 59)

  const { data: newSeason } = await supabase
    .from('seasons')
    .insert({
      month: nextMonth.toISOString().split('T')[0],
      started_at: nextMonth.toISOString(),
      ends_at: nextMonthEnd.toISOString(),
      status: 'active',
    })
    .select()
    .single()

  if (!newSeason) {
    return new Response(JSON.stringify({ error: 'Erreur création nouvelle saison' }), { status: 500 })
  }

  const { data: profiles } = await supabase.from('profiles').select('id')
  if (!profiles) {
    return new Response(JSON.stringify({ error: 'Erreur récupération profils' }), { status: 500 })
  }

  const today = new Date().toISOString().split('T')[0]
  let credited = 0

  for (const profile of profiles) {
    const { error } = await supabase.from('balances').insert({
      user_id: profile.id,
      season_id: newSeason.id,
      points: 1000,
    })
    if (error) continue

    await supabase.from('point_grants').insert({
      user_id: profile.id,
      season_id: newSeason.id,
      type: 'monthly',
      amount: 1000,
      grant_date: today,
    })
    credited++
  }

  return new Response(
    JSON.stringify({
      success: true,
      closed_season: currentSeason.id,
      new_season: newSeason.id,
      players_credited: credited,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
