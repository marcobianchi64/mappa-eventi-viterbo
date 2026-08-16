-- Censimento luoghi pilota — cinema provincia di Viterbo
-- Idempotente

INSERT INTO public.places (
  id, name, place_type, territory_id, municipality, status,
  primary_source_id, external_refs, notes
) VALUES
  (
    'place-cinema-arena-marconi-bolsena',
    'Arena Marconi',
    'cinema',
    'IT-VT',
    'Bolsena',
    'active',
    'src-mymovies-vt',
    '{"mymovies": {"slug": "bolsena", "venue_id": "23914", "url": "https://www.mymovies.it/cinema/viterbo/bolsena/23914/"}}'::jsonb,
    'Cinema all''aperto — programmazione stagionale'
  ),
  (
    'place-cinema-moderno-bolsena',
    'Multisala Moderno',
    'cinema',
    'IT-VT',
    'Bolsena',
    'active',
    'src-mymovies-vt',
    '{"mymovies": {"slug": "bolsena", "venue_id": "6566", "url": "https://www.mymovies.it/cinema/viterbo/bolsena/6566/"}}'::jsonb,
    NULL
  ),
  (
    'place-cinema-arena-etrusco-tarquinia',
    'Arena Etrusco Lido',
    'cinema',
    'IT-VT',
    'Tarquinia',
    'seasonal',
    'src-mymovies-vt',
    '{"mymovies": {"slug": "tarquinia", "venue_id": "20275", "url": "https://www.mymovies.it/cinema/viterbo/tarquinia/20275/"}}'::jsonb,
    'Cinema estivo sul lido'
  ),
  (
    'place-cinema-thespace-viterbo',
    'The Space Cinema',
    'cinema',
    'IT-VT',
    'Viterbo',
    'active',
    NULL,
    '{"comingsoon": {"url": "https://www.comingsoon.it/cinema/viterbo/the-space-cinema-viterbo/5085/"}}'::jsonb,
    'Multisala Viterbo — fonte MYmovies assente, censito per gap detection'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  municipality = EXCLUDED.municipality,
  status = EXCLUDED.status,
  external_refs = EXCLUDED.external_refs,
  notes = EXCLUDED.notes;
