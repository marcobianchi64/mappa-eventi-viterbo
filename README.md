# mappa-eventi-viterbo

**Project Atlas** — mappa interattiva per scoprire e segnalare eventi a Viterbo e in provincia.

## Stato del progetto

Il prototipo originale (file HTML monolitici) è stato riprogettato in un **monorepo modulare** con TypeScript, Vite e Supabase.

| Componente | Percorso | Descrizione |
|------------|----------|-------------|
| Mappa pubblica | `apps/web` | Esplorazione eventi, ricerca, segnalazione |
| Control center | `apps/admin` | Moderazione eventi in attesa |
| Logica condivisa | `packages/core` | Tipi, filtri, utilità |
| API dati | `packages/supabase-client` | Repository Supabase |
| Prototipo legacy | `legacy/` | Versione 0.6.4 originale (deprecata) |

## Avvio rapido

```bash
# 1. Installa dipendenze
npm install

# 2. Configura Supabase (copia e modifica)
cp apps/web/.env.example apps/web/.env
cp apps/admin/.env.example apps/admin/.env

# 3. Avvia in sviluppo
npm run dev          # Mappa → http://localhost:5173
npm run dev:admin    # Admin → porta successiva
```

## Build produzione

```bash
npm run build
# Output: apps/web/dist e apps/admin/dist
```

## Documentazione

- [Architettura](./docs/ARCHITECTURE.md)
- [Roadmap](./docs/ROADMAP.md)
- [Schema Supabase + RLS](./supabase/schema.sql)

## Dati esistenti

Il progetto è compatibile con la tabella `events` già presente su Supabase. Non è necessaria una migrazione dati per passare dal prototipo alla nuova architettura.

## Deploy

- **Web**: GitHub Actions deploy su Pages (vedi `.github/workflows/deploy.yml`)
- Configura i secret del repository: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Licenza

Progetto personale — Viterbo e provincia.
