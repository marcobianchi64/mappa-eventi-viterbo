-- Fase discovery: import manuale eventi + candidati fonte

INSERT INTO public.sources (
  id, name, source_type, territory_id, url,
  acquisition_mode, reliability, update_frequency, status, notes
) VALUES (
  'src-manual-discovery',
  'Scoperta manuale (AI + verifica)',
  'other',
  'IT-VT',
  NULL,
  'assisted',
  'B',
  'on_demand',
  'active',
  'Eventi importati da CSV dopo ricerca AI e verifica umana'
)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.source_candidates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT,
  url TEXT NOT NULL,
  source_type TEXT DEFAULT 'other',
  territory_id TEXT REFERENCES public.territories (id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'validated', 'rejected', 'promoted')),
  notes TEXT,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_source_candidates_url
  ON public.source_candidates (url);

CREATE INDEX IF NOT EXISTS idx_source_candidates_status
  ON public.source_candidates (status);

ALTER TABLE public.source_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "source_candidates_admin"
  ON public.source_candidates FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS source_candidates_updated_at ON public.source_candidates;
CREATE TRIGGER source_candidates_updated_at
  BEFORE UPDATE ON public.source_candidates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
