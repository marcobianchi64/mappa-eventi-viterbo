-- Atlas Fase 0: Territori, Fonti, Segnalazioni
-- Eseguire su Supabase SQL Editor dopo schema.sql base

-- ---------------------------------------------------------------------------
-- Territori (gerarchia scalabile)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.territories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('country', 'region', 'province', 'municipality', 'locality')),
  parent_id TEXT REFERENCES public.territories (id) ON DELETE SET NULL,
  country_code TEXT NOT NULL DEFAULT 'IT',
  timezone TEXT NOT NULL DEFAULT 'Europe/Rome',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_territories_parent ON public.territories (parent_id);
CREATE INDEX IF NOT EXISTS idx_territories_level ON public.territories (level);

ALTER TABLE public.territories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "territories_public_read"
  ON public.territories FOR SELECT
  USING (true);

CREATE POLICY "territories_admin_write"
  ON public.territories FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Fonti (patrimonio principale)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sources (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'aggregator'
    CHECK (source_type IN (
      'institutional', 'aggregator', 'editorial', 'cultural',
      'association', 'commercial', 'social', 'user_report', 'other'
    )),
  territory_id TEXT REFERENCES public.territories (id) ON DELETE SET NULL,
  url TEXT,
  acquisition_mode TEXT NOT NULL DEFAULT 'manual'
    CHECK (acquisition_mode IN ('manual', 'assisted', 'automatic', 'api')),
  reliability TEXT NOT NULL DEFAULT 'B'
    CHECK (reliability IN ('A', 'B', 'C')),
  update_frequency TEXT NOT NULL DEFAULT 'daily',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'error')),
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  events_produced INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sources_territory ON public.sources (territory_id);
CREATE INDEX IF NOT EXISTS idx_sources_status ON public.sources (status);

ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sources_public_read"
  ON public.sources FOR SELECT
  USING (status = 'active');

CREATE POLICY "sources_admin_all"
  ON public.sources FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS sources_updated_at ON public.sources;
CREATE TRIGGER sources_updated_at
  BEFORE UPDATE ON public.sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Estensioni tabella events
-- ---------------------------------------------------------------------------
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS territory_id TEXT REFERENCES public.territories (id) ON DELETE SET NULL;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS promoted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS external_url TEXT;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Ampliamento categorie (6 macro-categorie Alpha)
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_category_check;
ALTER TABLE public.events ADD CONSTRAINT events_category_check
  CHECK (category IN ('music', 'food', 'culture', 'sport', 'families', 'other'));

CREATE INDEX IF NOT EXISTS idx_events_territory ON public.events (territory_id);
CREATE INDEX IF NOT EXISTS idx_events_archived ON public.events (archived);

-- Lettura pubblica: solo eventi verificati e non archiviati
DROP POLICY IF EXISTS "events_public_read" ON public.events;
CREATE POLICY "events_public_read"
  ON public.events FOR SELECT
  USING (verified = true AND archived = false);

-- ---------------------------------------------------------------------------
-- Segnalazioni utenti (con tracciabilità)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_submissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  category TEXT NOT NULL
    CHECK (category IN ('music', 'food', 'culture', 'sport', 'families', 'other')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  venue TEXT,
  event_url TEXT,
  image_url TEXT,
  description TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  contact TEXT NOT NULL,
  contact_type TEXT DEFAULT 'other'
    CHECK (contact_type IN ('email', 'whatsapp', 'phone', 'other')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'duplicate')),
  duplicate_of_event_id TEXT REFERENCES public.events (date_event) ON DELETE SET NULL,
  review_notes TEXT,
  territory_id TEXT REFERENCES public.territories (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.event_submissions (status);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON public.event_submissions (created_at DESC);

ALTER TABLE public.event_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "submissions_public_insert"
  ON public.event_submissions FOR INSERT
  WITH CHECK (status = 'pending');

CREATE POLICY "submissions_admin_read"
  ON public.event_submissions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "submissions_admin_update"
  ON public.event_submissions FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
