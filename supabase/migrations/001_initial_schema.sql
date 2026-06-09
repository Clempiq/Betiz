-- ============================================================
-- BETIZ — Migration initiale
-- À exécuter dans Supabase Dashboard → SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  date_of_birth DATE,
  age_confirmed BOOLEAN DEFAULT FALSE,
  device_fingerprint TEXT,
  signup_ip TEXT,
  is_flagged BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEASONS
CREATE TABLE IF NOT EXISTS public.seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month DATE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed'))
);

-- BALANCES (porte-monnaie par saison)
CREATE TABLE IF NOT EXISTS public.balances (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  points BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, season_id)
);

-- POINT_GRANTS (idempotence — une seule distribution par user/type/jour)
CREATE TABLE IF NOT EXISTS public.point_grants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('monthly', 'daily', 'ad_reward', 'initial')),
  amount INT NOT NULL,
  grant_date DATE NOT NULL DEFAULT CURRENT_DATE,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_daily_grant UNIQUE (user_id, type, grant_date)
);

-- MATCHES
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT UNIQUE NOT NULL,
  sport TEXT NOT NULL,
  league TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'finished', 'cancelled')),
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ODDS
CREATE TABLE IF NOT EXISTS public.odds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  market TEXT NOT NULL,
  selection TEXT NOT NULL,
  value NUMERIC(6,2) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_odd UNIQUE (match_id, market, selection)
);

-- BETS
CREATE TABLE IF NOT EXISTS public.bets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  stake INT NOT NULL CHECK (stake > 0),
  total_odds NUMERIC(8,2) NOT NULL CHECK (total_odds <= 50),
  potential_payout BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'void')),
  placed_at TIMESTAMPTZ DEFAULT NOW(),
  settled_at TIMESTAMPTZ
);

-- BET_SELECTIONS (lignes d'un combiné)
CREATE TABLE IF NOT EXISTS public.bet_selections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bet_id UUID NOT NULL REFERENCES public.bets(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  market TEXT NOT NULL,
  selection TEXT NOT NULL,
  odds_value NUMERIC(6,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'void'))
);

-- ACHIEVEMENTS (catalogue de badges)
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  criteria JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- USER_ACHIEVEMENTS (badges débloqués — persistants, hors saison)
CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

-- REWARDS
CREATE TABLE IF NOT EXISTS public.rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rank INT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('gift_card', 'badge')),
  value NUMERIC(8,2),
  details JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'claimed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_public" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seasons_select_public" ON public.seasons FOR SELECT USING (true);

ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "balances_select_public" ON public.balances FOR SELECT USING (true);
CREATE POLICY "balances_insert_own" ON public.balances FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "balances_update_own" ON public.balances FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE public.point_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "point_grants_select_own" ON public.point_grants FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches_select_public" ON public.matches FOR SELECT USING (true);

ALTER TABLE public.odds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "odds_select_public" ON public.odds FOR SELECT USING (true);

ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bets_select_own" ON public.bets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bets_insert_own" ON public.bets FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.bet_selections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bet_selections_select_own" ON public.bet_selections
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.bets WHERE bets.id = bet_selections.bet_id AND bets.user_id = auth.uid())
  );

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements_select_public" ON public.achievements FOR SELECT USING (true);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_achievements_select_public" ON public.user_achievements FOR SELECT USING (true);

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rewards_select_own" ON public.rewards FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGER : création automatique du profil + balance à l'inscription
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  active_season_id UUID;
BEGIN
  INSERT INTO public.profiles (id, username, date_of_birth, age_confirmed)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::TEXT, 8)),
    (NEW.raw_user_meta_data->>'date_of_birth')::DATE,
    COALESCE((NEW.raw_user_meta_data->>'age_confirmed')::BOOLEAN, FALSE)
  );

  SELECT id INTO active_season_id FROM public.seasons WHERE status = 'active' LIMIT 1;

  IF active_season_id IS NOT NULL THEN
    INSERT INTO public.balances (user_id, season_id, points)
    VALUES (NEW.id, active_season_id, 1000);

    INSERT INTO public.point_grants (user_id, season_id, type, amount)
    VALUES (NEW.id, active_season_id, 'initial', 1000)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- VUE CLASSEMENT (temps réel via Supabase Realtime)
-- ============================================================

CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  b.user_id,
  p.username,
  b.points,
  b.season_id,
  RANK() OVER (PARTITION BY b.season_id ORDER BY b.points DESC) AS rank
FROM public.balances b
JOIN public.profiles p ON p.id = b.user_id
ORDER BY b.season_id, b.points DESC;

-- ============================================================
-- SAISON INITIALE : Juin 2026
-- ============================================================

INSERT INTO public.seasons (month, started_at, ends_at, status)
VALUES (
  '2026-06-01',
  '2026-06-01T00:00:00Z',
  '2026-06-30T23:59:59Z',
  'active'
)
ON CONFLICT DO NOTHING;
