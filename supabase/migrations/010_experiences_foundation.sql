-- Esperienze: offerte ripetibili, distinte dagli eventi con data.
CREATE TABLE IF NOT EXISTS public.experiences (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  experience_type TEXT NOT NULL CHECK (experience_type IN (
    'tour', 'tasting', 'food', 'activity', 'workshop', 'trail', 'lodging', 'other'
  )),
  category TEXT NOT NULL CHECK (category IN ('music', 'food', 'culture', 'sport', 'families', 'other')),
  territory_id TEXT REFERENCES public.territories (id) ON DELETE SET NULL,
  place_id TEXT REFERENCES public.places (id) ON DELETE SET NULL,
  municipality TEXT,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  description TEXT,
  image_url TEXT,
  info_url TEXT,
  price_hint TEXT NOT NULL DEFAULT 'unknown' CHECK (price_hint IN ('free', 'paid', 'mixed', 'unknown')),
  repeatability TEXT NOT NULL DEFAULT 'ongoing' CHECK (repeatability IN ('ongoing', 'seasonal', 'on_request')),
  status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('active', 'seasonal', 'closed', 'unknown')),
  primary_source_id TEXT REFERENCES public.sources (id) ON DELETE SET NULL,
  external_id TEXT,
  external_refs JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_experiences_territory_status ON public.experiences (territory_id, status);
CREATE INDEX IF NOT EXISTS idx_experiences_type_status ON public.experiences (experience_type, status);
CREATE INDEX IF NOT EXISTS idx_experiences_place ON public.experiences (place_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_experiences_source_external
  ON public.experiences (primary_source_id, external_id) WHERE external_id IS NOT NULL;

ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "experiences_public_read" ON public.experiences FOR SELECT
  USING (status IN ('active', 'seasonal', 'unknown'));
CREATE POLICY "experiences_admin_all" ON public.experiences FOR ALL
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS experiences_updated_at ON public.experiences;
CREATE TRIGGER experiences_updated_at
  BEFORE UPDATE ON public.experiences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
