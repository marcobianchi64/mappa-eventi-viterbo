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
    'closed',
    NULL,
    '{}'::jsonb,
    'Record corretto il 2026-08-16: il precedente URL ComingSoon 5085 reindirizza a Bologna; nessuna sede The Space risulta nella provincia.'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  municipality = EXCLUDED.municipality,
  status = EXCLUDED.status,
  external_refs = EXCLUDED.external_refs,
  notes = EXCLUDED.notes;

-- Sale rilevate dal censimento anagrafico manuale fornito il 2026-08-16.
-- Non sono programmazioni: restano nel registro anche senza film oggi.
INSERT INTO public.places (
  id, name, place_type, territory_id, municipality, status, notes
) VALUES
  ('place-cinema-olimpya-acquapendente', 'Olimpya', 'cinema', 'IT-VT', 'Acquapendente', 'unknown', 'Censimento manuale 2026-08-16: da verificare operatività'),
  ('place-cinema-florida-civita-castellana', 'Florida', 'cinema', 'IT-VT', 'Civita Castellana', 'unknown', 'Censimento manuale 2026-08-16: da verificare operatività'),
  ('place-cinema-multisala-flavia-montefiascone', 'Multisala Flavia', 'cinema', 'IT-VT', 'Montefiascone', 'unknown', 'Censimento manuale 2026-08-16: da verificare operatività'),
  ('place-cinema-florida-soriano-cimino', 'Florida', 'cinema', 'IT-VT', 'Soriano nel Cimino', 'unknown', 'Censimento manuale 2026-08-16: da verificare operatività'),
  ('place-cinema-colombo-valentano', 'Colombo', 'cinema', 'IT-VT', 'Valentano', 'unknown', 'Censimento manuale 2026-08-16: da verificare operatività'),
  ('place-cinema-albertone-nazionale-vasanello', 'Albertone Nazionale', 'cinema', 'IT-VT', 'Vasanello', 'unknown', 'Censimento manuale 2026-08-16: da verificare operatività'),
  ('place-cinema-lux-viterbo', 'Lux', 'cinema', 'IT-VT', 'Viterbo', 'unknown', 'Censimento manuale 2026-08-16: da verificare operatività'),
  ('place-cinema-trento-viterbo', 'Trento', 'cinema', 'IT-VT', 'Viterbo', 'unknown', 'Censimento manuale 2026-08-16: da verificare operatività')
ON CONFLICT (id) DO NOTHING;

-- La fonte, l'indirizzo e gli schermi rimangono dati strutturati e interrogabili.
UPDATE public.places AS place
SET
  name = census.name,
  municipality = census.municipality,
  address = census.address,
  screen_count = census.screen_count,
  status = census.status,
  registry_source = 'Censimento manuale fornito dal committente',
  registry_observed_at = DATE '2026-08-16',
  notes = census.notes
FROM (
  VALUES
    ('place-cinema-olimpya-acquapendente', 'Olimpya', 'Acquapendente', 'Via Cantorrivo, 5/a', 1, 'unknown', 'Da verificare operatività'),
    ('place-cinema-moderno-bolsena', 'Moderna', 'Bolsena', 'Via Marconi, snc', 2, 'unknown', 'Denominazione indicata come Moderna; da verificare operatività'),
    ('place-cinema-tevere-castiglione', 'Tevere', 'Castiglione in Teverina', 'Via Orvietana, 37', 1, 'unknown', 'Da verificare operatività'),
    ('place-cinema-florida-civita-castellana', 'Florida', 'Civita Castellana', 'Via del Forte, 26', 1, 'unknown', 'Da verificare operatività'),
    ('place-cinema-excelsior-vetralla', 'Excelsior', 'Cura di Vetralla', 'Via Cassia, 277', 1, 'unknown', 'Da verificare operatività'),
    ('place-cinema-multisala-flavia-montefiascone', 'Multisala Flavia', 'Montefiascone', 'Via della Croce, 1', 2, 'unknown', 'Da verificare operatività'),
    ('place-cinema-gallery-montefiascone', 'Gallery', 'Montefiascone', 'Via Cardinal Salotti, snc', 2, 'unknown', 'Da verificare operatività'),
    ('place-cinema-florida-soriano-cimino', 'Florida', 'Soriano nel Cimino', 'P.zza G. Marconi, 21', 1, 'unknown', 'Da verificare operatività'),
    ('place-cinema-etrusco-tarquinia', 'Etrusco', 'Tarquinia', 'Via della Caserma, 32', 4, 'unknown', 'Da verificare operatività'),
    ('place-cinema-colombo-valentano', 'Colombo', 'Valentano', 'Via Monte Grappa, 3', 1, 'unknown', 'Da verificare operatività'),
    ('place-cinema-albertone-nazionale-vasanello', 'Albertone Nazionale', 'Vasanello', 'Via S. Maria, 20', 1, 'unknown', 'Da verificare operatività'),
    ('place-cinema-lux-viterbo', 'Lux', 'Viterbo', 'Viale Trento, 1', 1, 'unknown', 'Da verificare operatività'),
    ('place-cinema-trento-viterbo', 'Trento', 'Viterbo', 'Via del Santuario, 51', 1, 'unknown', 'Da verificare operatività'),
    ('place-cinema-tuscia-village-vitorchiano', 'Cinetuscia Village', 'Vitorchiano', 'Via Marmolada, snc', 6, 'unknown', 'Denominazione indicata come Cinetuscia Village; da verificare operatività')
) AS census(id, name, municipality, address, screen_count, status, notes)
WHERE place.id = census.id;
