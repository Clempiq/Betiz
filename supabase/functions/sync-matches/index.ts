import { createClient } from 'jsr:@supabase/supabase-js@2'

const ODDS_API_KEY = '1357d018e24f68949f45203a3a215783'
const SPORT_KEY = 'soccer_fifa_world_cup'

Deno.serve(async (_req: Request) => {
  // sync-matches est appelable librement (ne fait qu'écrire des données publiques)
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey)

  const url = `https://api.the-odds-api.com/v4/sports/${SPORT_KEY}/odds/?apiKey=${ODDS_API_KEY}&regions=eu&markets=h2h&oddsFormat=decimal`
  const response = await fetch(url)

  if (!response.ok) {
    const text = await response.text()
    console.error('Odds API error:', text)
    return new Response(JSON.stringify({ error: text }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const events = await response.json()
  const remaining = response.headers.get('x-requests-remaining')
  console.log(`Odds API requests remaining: ${remaining}`)

  let matchesUpserted = 0
  let oddsUpserted = 0

  for (const event of events) {
    const { error: matchError } = await supabase
      .from('matches')
      .upsert({
        external_id: event.id,
        sport: event.sport_key,
        league: event.sport_title,
        home_team: event.home_team,
        away_team: event.away_team,
        start_time: event.commence_time,
        status: 'upcoming',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'external_id' })

    if (matchError) { console.error('Match upsert error:', matchError); continue }
    matchesUpserted++

    const { data: match } = await supabase
      .from('matches')
      .select('id')
      .eq('external_id', event.id)
      .single()

    if (!match) continue

    for (const bookmaker of (event.bookmakers ?? [])) {
      const h2h = bookmaker.markets?.find((m: any) => m.key === 'h2h')
      if (!h2h) continue

      for (const outcome of (h2h.outcomes ?? [])) {
        let selection = 'draw'
        if (outcome.name === event.home_team) selection = 'home'
        else if (outcome.name === event.away_team) selection = 'away'

        const { error } = await supabase
          .from('odds')
          .upsert({
            match_id: match.id,
            market: 'h2h',
            selection,
            value: outcome.price,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'match_id,market,selection' })

        if (!error) oddsUpserted++
      }
      break
    }
  }

  return new Response(
    JSON.stringify({ success: true, matches: matchesUpserted, odds: oddsUpserted, api_remaining: remaining }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
