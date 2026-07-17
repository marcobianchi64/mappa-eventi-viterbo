# Raccolta automatica eventi — Fase 1

## Fonti pilota (AUTO-1 + AUTO-2)

| ID | Metodo | URL feed/pagina |
|----|--------|-----------------|
| `src-tuscia-eventi` | RSS | https://www.tusciaeventi.it/eventi/feed/ |
| `src-eventi-tuscia` | RSS | https://www.eventidellatuscia.it/feed/ |
| `src-comune-viterbo` | HTML | https://comune.viterbo.it/vivere-il-comune/eventi/ |
| `src-viterbotoday` | HTML | https://www.viterbotoday.it/eventi/ |
| `src-tusciaup` | HTML | https://www.tusciaup.it/eventi/ |

## Esecuzione manuale

```bash
cp packages/collector/.env.example packages/collector/.env
# Inserire SUPABASE_SERVICE_ROLE_KEY (Dashboard → Settings → API)

npm run collect
```

Il file `.env` viene letto automaticamente dal collector (non serve più `source` manuale).

Solo una fonte:

```bash
ATLAS_SOURCES=src-tuscia-eventi npm run collect
```

## Automazione

- GitHub Actions: `.github/workflows/collect.yml` (ogni giorno ore 06:00 UTC + avvio manuale)
- Secret richiesto: `SUPABASE_SERVICE_ROLE_KEY`

## Regole

- Eventi **passati** → scartati
- Fonti **A/B** + controlli OK → pubblicati automaticamente (`verified: true`)
- Duplicati tra fonti diverse → saltati
- Coordinate via **Nominatim** (cache locale in `packages/collector/data/`)

## Migrazione DB

Eseguire anche `supabase/migrations/002_collector.sql` per `external_id` e log sync.
