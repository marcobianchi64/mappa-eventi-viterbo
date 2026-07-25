-- Fase 2: attiva raccolta automatica per ViterboToday e TusciaUp

UPDATE public.sources
SET
  acquisition_mode = 'automatic',
  notes = COALESCE(notes, '') || ' | AUTO-2 attivo'
WHERE id IN ('src-viterbotoday', 'src-tusciaup');
