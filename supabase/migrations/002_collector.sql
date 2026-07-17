-- Collector: external_id per dedup e log sincronizzazioni

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS external_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_source_external
  ON public.events (source_id, external_id)
  WHERE external_id IS NOT NULL AND source_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.source_sync_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  source_id TEXT REFERENCES public.sources (id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'partial', 'error')),
  events_found INTEGER NOT NULL DEFAULT 0,
  events_inserted INTEGER NOT NULL DEFAULT 0,
  events_updated INTEGER NOT NULL DEFAULT 0,
  events_skipped INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  details JSONB
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_source ON public.source_sync_logs (source_id, started_at DESC);

ALTER TABLE public.source_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_logs_admin"
  ON public.source_sync_logs FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Service role bypassa RLS; policy per admin UI
