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
    'place-cinema-tevere-castiglione',
    'Tevere',
    'cinema',
    'IT-VT',
    'Castiglione in Teverina',
    'active',
    'src-mymovies-vt',
    '{"mymovies": {"slug": "castiglioneinteverina", "venue_id": "6102", "url": "https://www.mymovies.it/cinema/viterbo/castiglioneinteverina/6102/"}}'::jsonb,
    NULL
  ),
  (
    'place-cinema-gallery-montefiascone',
    'Cinema Multisala Gallery',
    'cinema',
    'IT-VT',
    'Montefiascone',
    'active',
    'src-mymovies-vt',
    '{"mymovies": {"slug": "montefiascone", "venue_id": "5883", "url": "https://www.mymovies.it/cinema/viterbo/montefiascone/5883/"}}'::jsonb,
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
    'place-cinema-etrusco-tarquinia',
    'Etrusco',
    'cinema',
    'IT-VT',
    'Tarquinia',
    'active',
    'src-mymovies-vt',
    '{"mymovies": {"slug": "tarquinia", "venue_id": "4985", "url": "https://www.mymovies.it/cinema/viterbo/tarquinia/4985/"}}'::jsonb,
    NULL
  ),
  (
    'place-cinema-excelsior-vetralla',
    'Excelsior',
    'cinema',
    'IT-VT',
    'Vetralla',
    'active',
    'src-mymovies-vt',
    '{"mymovies": {"slug": "cura", "venue_id": "6173", "url": "https://www.mymovies.it/cinema/viterbo/cura/6173/"}}'::jsonb,
    'Frazione Cura di Vetralla su MYmovies'
  ),
  (
    'place-cinema-tuscia-village-vitorchiano',
    'Cine Tuscia Village',
    'cinema',
    'IT-VT',
    'Vitorchiano',
    'active',
    'src-mymovies-vt',
    '{"mymovies": {"slug": "vitorchiano", "venue_id": "21249", "url": "https://www.mymovies.it/cinema/viterbo/vitorchiano/21249/"}}'::jsonb,
    NULL
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
