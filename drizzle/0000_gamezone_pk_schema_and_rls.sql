-- =============================================================================
-- GAMEZONE PK — POSTGRESQL & SUPABASE COMPATIBLE SCHEMA & RLS MIGRATION
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id serial PRIMARY KEY,
  uid text NOT NULL UNIQUE,
  email text NOT NULL,
  username text NOT NULL,
  avatar_url text DEFAULT '',
  preferred_language text DEFAULT 'en' NOT NULL,
  role text DEFAULT 'player' NOT NULL,
  xp integer DEFAULT 0 NOT NULL,
  account_status text DEFAULT 'active' NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.games (
  id serial PRIMARY KEY,
  title text NOT NULL,
  title_ur text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL,
  description_ur text NOT NULL,
  category text NOT NULL,
  thumbnail_url text DEFAULT '' NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  is_featured boolean DEFAULT false NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.game_sessions (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  username text NOT NULL,
  game_id integer NOT NULL REFERENCES public.games(id),
  game_slug text NOT NULL,
  score integer NOT NULL,
  duration_seconds integer NOT NULL,
  is_moderated boolean DEFAULT false NOT NULL,
  completed_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.achievements (
  id serial PRIMARY KEY,
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  title_ur text NOT NULL,
  description text NOT NULL,
  description_ur text NOT NULL,
  icon text NOT NULL,
  xp_reward integer NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  achievement_id integer NOT NULL REFERENCES public.achievements(id),
  unlocked_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id serial PRIMARY KEY,
  user_id text,
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'open' NOT NULL,
  admin_note text DEFAULT '',
  created_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read_at timestamp,
  created_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payment_records (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  merchant_order_ref text NOT NULL UNIQUE,
  amount_pkr integer NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  provider_reference text DEFAULT '',
  purpose text DEFAULT '',
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id serial PRIMARY KEY,
  admin_uid text NOT NULL,
  admin_email text NOT NULL,
  action text NOT NULL,
  details text NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL
);

-- Indexes for fast leaderboard sorting and user lookups
CREATE INDEX IF NOT EXISTS idx_game_sessions_leaderboard ON public.game_sessions (game_slug, is_moderated, score DESC, duration_seconds ASC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON public.game_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id);

-- Row Level Security (RLS) Policies for Supabase PostgreSQL Deployment
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
