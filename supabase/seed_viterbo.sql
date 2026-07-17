-- Seed pilota: Provincia di Viterbo + fonti prioritarie
-- Idempotente: usa ON CONFLICT DO NOTHING

INSERT INTO public.territories (id, name, level, parent_id, country_code) VALUES
  ('IT', 'Italia', 'country', NULL, 'IT'),
  ('IT-12', 'Lazio', 'region', 'IT', 'IT'),
  ('IT-VT', 'Provincia di Viterbo', 'province', 'IT-12', 'IT'),
  ('IT-VT-VITERBO', 'Viterbo', 'municipality', 'IT-VT', 'IT')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sources (
  id, name, source_type, territory_id, url,
  acquisition_mode, reliability, update_frequency, status, notes
) VALUES
  (
    'src-comune-viterbo',
    'Comune di Viterbo — Eventi',
    'institutional',
    'IT-VT-VITERBO',
    'https://comune.viterbo.it/vivere-il-comune/eventi/',
    'automatic',
    'A',
    'daily',
    'active',
    'AUTO-1: calendario istituzionale capoluogo'
  ),
  (
    'src-tuscia-eventi',
    'Tuscia Eventi',
    'aggregator',
    'IT-VT',
    'https://www.tusciaeventi.it/eventi/',
    'automatic',
    'B',
    'daily',
    'active',
    'AUTO-1: portale eventi provincia'
  ),
  (
    'src-eventi-tuscia',
    'Eventi della Tuscia',
    'aggregator',
    'IT-VT',
    'https://www.eventidellatuscia.it/',
    'automatic',
    'B',
    'daily',
    'active',
    'AUTO-1: sagre, cultura, folklore'
  ),
  (
    'src-viterbotoday',
    'ViterboToday — Eventi',
    'editorial',
    'IT-VT',
    'https://www.viterbotoday.it/eventi/',
    'automatic',
    'B',
    'daily',
    'active',
    'AUTO-2: sezione eventi testata locale'
  ),
  (
    'src-tusciaup',
    'TusciaUp — Eventi',
    'editorial',
    'IT-VT',
    'https://www.tusciaup.it/eventi/',
    'automatic',
    'B',
    'daily',
    'active',
    'AUTO-2: tempo libero e cultura'
  ),
  (
    'src-user-reports',
    'Segnalazioni utenti',
    'user_report',
    'IT-VT',
    NULL,
    'manual',
    'C',
    'on_demand',
    'active',
    'Eventi proposti dagli utenti con contatto obbligatorio'
  )
ON CONFLICT (id) DO NOTHING;
