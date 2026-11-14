-- Snapshot utilità (farmacie + cinema) leggibile dalla mappa pubblica

CREATE TABLE IF NOT EXISTS public.utility_edition_snapshots (
  edition_id TEXT PRIMARY KEY,
  territory_id TEXT,
  snapshot JSONB NOT NULL,
  pharmacy_duty_date DATE,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_utility_snapshots_synced
  ON public.utility_edition_snapshots (synced_at DESC);

ALTER TABLE public.utility_edition_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "utility_snapshots_public_read"
  ON public.utility_edition_snapshots FOR SELECT
  USING (true);

DROP TRIGGER IF EXISTS utility_edition_snapshots_updated_at ON public.utility_edition_snapshots;
CREATE TRIGGER utility_edition_snapshots_updated_at
  BEFORE UPDATE ON public.utility_edition_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();