-- Registro luoghi: dati anagrafici stabili separati dalle osservazioni giornaliere.
ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS screen_count INTEGER
    CHECK (screen_count IS NULL OR screen_count > 0),
  ADD COLUMN IF NOT EXISTS registry_source TEXT,
  ADD COLUMN IF NOT EXISTS registry_observed_at DATE;

COMMENT ON COLUMN public.places.screen_count IS
  'Numero di schermi/sale fisiche dichiarato dalla fonte anagrafica';
COMMENT ON COLUMN public.places.registry_source IS
  'Provenienza del dato anagrafico, distinta dalla fonte di programmazione';
COMMENT ON COLUMN public.places.registry_observed_at IS
  'Data dell''ultima osservazione anagrafica';

-- Un luogo da verificare resta consultabile: la sua presenza nell'anagrafica
-- non deve dipendere dalla programmazione giornaliera.
DROP POLICY IF EXISTS "places_public_read" ON public.places;
CREATE POLICY "places_public_read"
  ON public.places FOR SELECT
  USING (status IN ('active', 'seasonal', 'unknown'));
