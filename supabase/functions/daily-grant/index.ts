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

  const { data: season } = await supabase
    .from('seasons')
    .select('id')
    .eq('status', 'active')
    .single()

  if (!season) {
    return new Response(JSON.stringify({ error: 'Aucune saison active' }), { status: 400 })
  }

  const today = new Date().toISOString().split('T')[0]

  const { data: profiles } = await supabase.from('profiles').select('id')
  if (!profiles) {
    return new Response(JSON.stringify({ error: 'Erreur récupération profils' }), { status: 500 })
  }

  let credited = 0
  let skipped = 0

  for (const profile of profiles) {
    const { error: grantError } = await supabase
      .from('point_grants')
      .insert({
        user_id: profile.id,
        season_id: season.id,
        type: 'daily',
        amount: 100,
        grant_date: today,
      })

    if (grantError) {
      skipped++
      continue
    }

    await supabase.rpc('increment_balance', {
      p_user_id: profile.id,
      p_season_id: season.id,
      p_amount: 100,
    })

    credited++
  }

  return new Response(
    JSON.stringify({ success: true, credited, skipped, date: today }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
