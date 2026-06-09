import { createClient } from 'jsr:@supabase/supabase-js@2'

const ODDS_API_KEY = '1357d018e24f68949f45203a3a215783'
const SPORT_KEY = 'soccer_fifa_world_cup'

Deno.serve(async (req: Request) => {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const isInternal = req.headers.get('x-internal-cron') === 'true'
  const isBearerValid = req.headers.get('Authorization') === `Bearer ${serviceKey}`
  if (!isInternal && !isBearerValid) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey)

  const url = `https://api.the-odds-api.com/v4/sports/${SPORT_KEY}/scores/?apiKey=${ODDS_API_KEY}&daysFrom=3`
  const response = await fetch(url)

  if (!response.ok) {
    return new Response(JSON.stringify({ error: 'Odds API scores error' }), { status: 500 })
  }

  const scoreData = await response.json()
  let betsSettled = 0

  for (const score of scoreData) {
    if (!score.completed || !score.scores) continue

    const { data: match } = await supabase
      .from('matches')
      .select('id, home_team, away_team, status')
      .eq('external_id', score.id)
      .single()

    if (!match || match.status === 'finished') continue

    const homeScore = parseInt(score.scores.find((s: any) => s.name === match.home_team)?.score ?? '0')
    const awayScore = parseInt(score.scores.find((s: any) => s.name === match.away_team)?.score ?? '0')

    let winner: string
    if (homeScore > awayScore) winner = 'home'
    else if (awayScore > homeScore) winner = 'away'
    else winner = 'draw'

    await supabase.from('matches').update({
      status: 'finished',
      result: { home_score: homeScore, away_score: awayScore, winner },
      updated_at: new Date().toISOString(),
    }).eq('id', match.id)

    const { data: selections } = await supabase
      .from('bet_selections')
      .select('id, bet_id, selection')
      .eq('match_id', match.id)
      .eq('status', 'pending')

    if (!selections || selections.length === 0) continue

    for (const sel of selections) {
      await supabase.from('bet_selections')
        .update({ status: sel.selection === winner ? 'won' : 'lost' })
        .eq('id', sel.id)
    }

    const affectedBetIds = [...new Set(selections.map((s: any) => s.bet_id))]

    for (const betId of affectedBetIds) {
      const { data: allSels } = await supabase
        .from('bet_selections')
        .select('status')
        .eq('bet_id', betId)

      if (!allSels || allSels.some(s => s.status === 'pending')) continue

      const betStatus = allSels.some(s => s.status === 'lost') ? 'lost' : 'won'

      const { data: bet } = await supabase
        .from('bets')
        .select('user_id, season_id, stake, total_odds')
        .eq('id', betId)
        .single()

      if (!bet) continue

      await supabase.from('bets').update({
        status: betStatus,
        settled_at: new Date().toISOString(),
      }).eq('id', betId)

      if (betStatus === 'won') {
        await supabase.rpc('increment_balance', {
          p_user_id: bet.user_id,
          p_season_id: bet.season_id,
          p_amount: Math.floor(bet.stake * bet.total_odds),
        })
      }

      betsSettled++
    }
  }

  return new Response(
    JSON.stringify({ success: true, bets_settled: betsSettled }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
