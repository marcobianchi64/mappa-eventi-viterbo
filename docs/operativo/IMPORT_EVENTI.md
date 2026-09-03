# Import eventi da CSV

Importa eventi verificati manualmente (workflow AI + Excel) nel database Supabase.

## Prerequisiti

- `packages/collector/.env` con `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`
- Migrazione `004_manual_discovery.sql` eseguita su Supabase
- CSV con separatore `;` o `,` (vedi `TEMPLATE_EVENTI.csv`)

## Uso

```bash
# Anteprima
npm run import:events -- --dry-run percorso/eventi.csv

# Import (solo righe stato=ok)
npm run import:events -- percorso/eventi.csv

# Import + registra url_fonte come candidati
npm run import:events -- --register-sources percorso/eventi.csv

# Includi righe senza stato (pending, non pubblicate)
npm run import:events -- --include-pending percorso/eventi.csv
```

## Comportamento

| Campo CSV | Uso |
|-----------|-----|
| `stato=ok` | Importato, `verified=true`, visibile in mappa |
| `stato=scartato` | Ignorato |
| altro/vuoto | Ignorato (salvo `--include-pending` → pending) |
| `url_evento` | Link evento; usato per dedup |
| `url_fonte` | Tracciabilità; opzionale registrazione candidati |
| `comune` + `luogo` | Geocoding via Nominatim |
| `categoria` | Mappata su: music, food, culture, sport, families, other |

Fonte DB: `src-manual-discovery` (affidabilità B, acquisizione manuale assistita).

## Deduplicazione

- Stesso `url_evento` → aggiornamento
- Titolo + giorno + luogo simile → salta (già presente da altra fonte)
