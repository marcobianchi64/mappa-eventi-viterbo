-- Segnalazioni: distinzione nuovo evento vs miglioramento di uno esistente

ALTER TABLE public.event_submissions
  ADD COLUMN IF NOT EXISTS submission_kind TEXT NOT NULL DEFAULT 'new'
    CHECK (submission_kind IN ('new', 'correction')),
  ADD COLUMN IF NOT EXISTS related_event_id TEXT REFERENCES public.events (date_event) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_submissions_related_event
  ON public.event_submissions (related_event_id)
  WHERE related_event_id IS NOT NULL;
