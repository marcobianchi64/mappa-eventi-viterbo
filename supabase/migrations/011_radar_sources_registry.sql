-- Fase 1 Radar: registry connettori su DB + tracciabilità discovery

ALTER TABLE public.sources
  ADD COLUMN IF NOT EXISTS connector TEXT,
  ADD COLUMN IF NOT EXISTS connector_config JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.source_candidates
  ADD COLUMN IF NOT EXISTS discovered_from_url TEXT,
  ADD COLUMN IF NOT EXISTS probe_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.radar_runs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  territory_id TEXT REFERENCES public.territories (id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'partial', 'error')),
  pages_fetched INTEGER NOT NULL DEFAULT 0,
  links_scored INTEGER NOT NULL DEFAULT 0,
  candidates_upserted INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_radar_runs_territory ON public.radar_runs (territory_id, started_at DESC);

ALTER TABLE public.radar_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "radar_runs_admin"
  ON public.radar_runs FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Backfill connettori fonti automatiche Viterbo (allineato a AUTO_SOURCES in collector)
UPDATE public.sources SET
  connector = 'rss-tuscia-eventi',
  connector_config = '{"feed_url":"https://www.tusciaeventi.it/eventi/feed/"}'::jsonb
WHERE id = 'src-tuscia-eventi';

UPDATE public.sources SET
  connector = 'rss-eventi-tuscia',
  connector_config = '{"feed_url":"https://www.eventidellatuscia.it/feed/"}'::jsonb
WHERE id = 'src-eventi-tuscia';

UPDATE public.sources SET
  connector = 'html-comune-viterbo',
  connector_config = '{"page_url":"https://comune.viterbo.it/vivere-il-comune/eventi/"}'::jsonb
WHERE id = 'src-comune-viterbo';

UPDATE public.sources SET
  connector = 'html-viterbotoday',
  connector_config = '{"page_url":"https://www.viterbotoday.it/eventi/"}'::jsonb
WHERE id = 'src-viterbotoday';

UPDATE public.sources SET
  connector = 'html-tusciaup',
  connector_config = '{"page_url":"https://www.tusciaup.it/eventi/"}'::jsonb
WHERE id = 'src-tusciaup';

INSERT INTO public.sources (
  id, name, source_type, territory_id, url,
  acquisition_mode, reliability, update_frequency, status, notes,
  connector, connector_config
) VALUES (
  'src-tusciaweb-eventi',
  'Tusciaweb — Eventi',
  'editorial',
  'IT-VT',
  'https://www.tusciaweb.eu/category/eventi/',
  'automatic',
  'B',
  'daily',
  'active',
  'Radar Fase 1: feed categoria Eventi',
  'rss-tusciaweb-eventi',
  '{"feed_url":"https://www.tusciaweb.eu/category/eventi/feed/"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  acquisition_mode = EXCLUDED.acquisition_mode,
  connector = EXCLUDED.connector,
  connector_config = EXCLUDED.connector_config,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes;
