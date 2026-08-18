-- Atlas Information Model (AIM) — fondazione registro luoghi e osservazioni
-- Estende il patrimonio fonti per eventi, esperienze e utility.

-- Domini informativi coperti da una fonte
ALTER TABLE public.sources
  ADD COLUMN IF NOT EXISTS content_domains TEXT[] NOT NULL DEFAULT ARRAY['events']::TEXT[];

COMMENT ON COLUMN public.sources.content_domains IS
  'Domini: events, experiences, utilities, lodging, food, culture';

-- Luoghi fisici riutilizzabili (cinema, farmacia, teatro, sede pro loco…)
CREATE TABLE IF NOT EXISTS public.places (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  place_type TEXT NOT NULL CHECK (place_type IN (
    'cinema', 'pharmacy', 'theater', 'museum', 'municipality',
    'pro_loco', 'restaurant', 'lodging', 'venue', 'other'
  )),
  territory_id TEXT REFERENCES public.territories (id) ON DELETE SET NULL,
  municipality TEXT,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'seasonal', 'closed', 'unknown')),
  primary_source_id TEXT REFERENCES public.sources (id) ON DELETE SET NULL,
  external_refs JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_places_territory ON public.places (territory_id);
CREATE INDEX IF NOT EXISTS idx_places_type ON public.places (place_type);
CREATE INDEX IF NOT EXISTS idx_places_status ON public.places (status);

ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "places_public_read"
  ON public.places FOR SELECT
  USING (status IN ('active', 'seasonal'));

CREATE POLICY "places_admin_all"
  ON public.places FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS places_updated_at ON public.places;
CREATE TRIGGER places_updated_at
  BEFORE UPDATE ON public.places
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Osservazioni grezze per fonte (magazzino cronologico, non pubblico)
CREATE TABLE IF NOT EXISTS public.source_observations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  source_id TEXT REFERENCES public.sources (id) ON DELETE SET NULL,
  place_id TEXT REFERENCES public.places (id) ON DELETE SET NULL,
  domain TEXT NOT NULL DEFAULT 'events'
    CHECK (domain IN ('events', 'experiences', 'utilities', 'lodging', 'food')),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duty_date DATE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  item_count INTEGER NOT NULL DEFAULT 0,
  content_hash TEXT,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'processed', 'error'))
);

CREATE INDEX IF NOT EXISTS idx_observations_source ON public.source_observations (source_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_observations_place ON public.source_observations (place_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_observations_domain ON public.source_observations (domain, observed_at DESC);

ALTER TABLE public.source_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "observations_admin"
  ON public.source_observations FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Alert operativi per il Control Center
CREATE TABLE IF NOT EXISTS public.operational_alerts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'coverage_gap', 'sync_failure', 'stale_data', 'place_silent', 'review_queue'
  )),
  severity TEXT NOT NULL DEFAULT 'warning'
    CHECK (severity IN ('info', 'warning', 'critical')),
  territory_id TEXT REFERENCES public.territories (id) ON DELETE SET NULL,
  source_id TEXT REFERENCES public.sources (id) ON DELETE SET NULL,
  place_id TEXT REFERENCES public.places (id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
  consecutive_misses INTEGER NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.operational_alerts (status, severity);
CREATE INDEX IF NOT EXISTS idx_alerts_place ON public.operational_alerts (place_id, status);

ALTER TABLE public.operational_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alerts_admin"
  ON public.operational_alerts FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Fonti utility (cinema, farmacie) nel registro
INSERT INTO public.sources (
  id, name, source_type, territory_id, url,
  acquisition_mode, reliability, update_frequency, status, content_domains, notes
) VALUES
  (
    'src-mymovies-vt',
    'MYmovies — Cinema provincia VT',
    'commercial',
    'IT-VT',
    'https://www.mymovies.it/cinema/viterbo/provincia/',
    'automatic',
    'B',
    'daily',
    'active',
    ARRAY['utilities']::TEXT[],
    'Programmazione cinema provincia Viterbo'
  ),
  (
    'src-pg-pharmacy-vt',
    'Pagine Gialle — Farmacie turno VT',
    'commercial',
    'IT-VT',
    'https://www.paginegialle.it/farmacie-turno/viterbo',
    'automatic',
    'B',
    'daily',
    'active',
    ARRAY['utilities']::TEXT[],
    'Farmacie di turno provincia'
  )
ON CONFLICT (id) DO UPDATE SET
  content_domains = EXCLUDED.content_domains,
  url = EXCLUDED.url,
  notes = EXCLUDED.notes;
