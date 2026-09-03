-- Fonte autorevole per il registro anagrafico completo delle farmacie.
INSERT INTO public.sources (
  id, name, source_type, territory_id, url,
  acquisition_mode, reliability, update_frequency, status, content_domains, notes
) VALUES (
  'src-ministero-pharmacy-it',
  'Ministero della Salute — Registro farmacie',
  'institutional',
  'IT-VT',
  'https://www.dati.salute.gov.it/it/dataset/farmacie/',
  'automatic',
  'A',
  'daily',
  'active',
  ARRAY['utilities']::TEXT[],
  'Anagrafica nazionale delle farmacie aperte al pubblico; filtrata per provincia di Viterbo.'
)
ON CONFLICT (id) DO UPDATE SET
  url = EXCLUDED.url,
  reliability = EXCLUDED.reliability,
  update_frequency = EXCLUDED.update_frequency,
  content_domains = EXCLUDED.content_domains,
  notes = EXCLUDED.notes;
