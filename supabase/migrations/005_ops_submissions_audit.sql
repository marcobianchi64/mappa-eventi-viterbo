-- Ops Fase A: tracciabilità segnalazioni + permessi admin su eventi

ALTER TABLE public.event_submissions
  ADD COLUMN IF NOT EXISTS reference_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_reference
  ON public.event_submissions (reference_code)
  WHERE reference_code IS NOT NULL;

-- Admin autenticato può inserire eventi (pilota: un solo gestore)
DROP POLICY IF EXISTS "events_admin_insert" ON public.events;
CREATE POLICY "events_admin_insert"
  ON public.events FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Lettura completa eventi per admin (inclusi non verificati)
DROP POLICY IF EXISTS "events_admin_read_pending" ON public.events;
CREATE POLICY "events_admin_read_all"
  ON public.events FOR SELECT
  USING (auth.role() = 'authenticated' OR (verified = true AND archived = false));
