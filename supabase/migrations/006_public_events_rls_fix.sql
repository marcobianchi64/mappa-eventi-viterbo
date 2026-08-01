-- Corregge lettura pubblica: alcuni eventi avevano archived NULL e venivano
-- esclusi dalla policy (verified=true AND archived=false).

UPDATE public.events
SET archived = false
WHERE archived IS NULL;

DROP POLICY IF EXISTS "events_public_read" ON public.events;
CREATE POLICY "events_public_read"
  ON public.events FOR SELECT
  USING (verified = true AND COALESCE(archived, false) = false);
