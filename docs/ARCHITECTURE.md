# Project Atlas — Architettura

Project Atlas è una piattaforma per la scoperta e la gestione degli eventi su un territorio (Viterbo e provincia). Questa riprogettazione separa responsabilità, tipi condivisi e integrazione dati in un monorepo modulare.

## Struttura del repository

```
mappa-eventi-viterbo/
├── apps/
│   ├── web/                 # Mappa pubblica (utenti finali)
│   └── admin/               # Control center (moderazione eventi)
├── packages/
│   ├── core/                # Tipi, costanti, logica di dominio pura
│   └── supabase-client/     # Accesso dati Supabase (repository)
├── docs/                    # Documentazione tecnica
├── supabase/                # Schema SQL e policy RLS
├── legacy/                  # Prototipo HTML originale (deprecato)
└── .github/workflows/       # CI e deploy
```

## Principi di design

| Principio | Implementazione |
|-----------|-----------------|
| **Modularità** | Logica di dominio in `@atlas/core`, API dati in `@atlas/supabase-client`, UI nelle app |
| **Sicurezza** | Credenziali via variabili d'ambiente; RLS Supabase documentato; admin protetto da auth OTP |
| **Scalabilità** | Monorepo npm workspaces; app web e admin indipendenti; pronto per nuovi moduli (notifiche, itinerari, API) |
| **Compatibilità** | Stesso schema `events` Supabase del prototipo; migrazione senza perdita dati |

## Flusso dati

```mermaid
flowchart LR
  subgraph client [Client]
    Web[apps/web]
    Admin[apps/admin]
  end

  subgraph shared [Packages condivisi]
    Core[@atlas/core]
    API[@atlas/supabase-client]
  end

  subgraph backend [Backend]
    SB[(Supabase PostgreSQL)]
    Auth[Supabase Auth]
  end

  Web --> Core
  Web --> API
  Admin --> Core
  Admin --> API
  API --> SB
  Admin --> Auth
```

## Modello evento

Campi principali della tabella `events` (compatibile con i dati esistenti):

- `date_event` — identificativo primario
- `title`, `category`, `start_date`, `end_date`
- `venue`, `lat`, `lng`
- `event_url`, `image_url`, `description`
- `verified` (boolean) — visibile sulla mappa pubblica
- `review_status` — `pending` | `approved` | `rejected`

## App web (`apps/web`)

Moduli:

- `app.ts` — orchestrazione UI e stato
- `map/map-service.ts` — mappa Leaflet e marker
- `services/interests.ts` — eventi salvati (localStorage)
- `ui/shell.ts` — template HTML
- `ui/event-sheet.ts` — scheda dettaglio evento
- `ui/toast.ts` — feedback utente

Funzionalità migrate dal prototipo:

- Mappa interattiva con filtri temporali
- Ricerca locale tra eventi attivi
- Geolocalizzazione "vicino a me"
- Segnalazione eventi (revisione admin)
- Salvataggio eventi e condivisione

## App admin (`apps/admin`)

- Login amministratore via magic link (Supabase Auth OTP)
- Lista eventi `review_status = pending`
- Approvazione / rifiuto con aggiornamento `verified`

## Configurazione

1. Copia `apps/web/.env.example` → `apps/web/.env`
2. Copia `apps/admin/.env.example` → `apps/admin/.env`
3. Inserisci `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` dal dashboard Supabase

```bash
npm install
npm run dev          # mappa pubblica su http://localhost:5173
npm run dev:admin    # control center su http://localhost:5174 (porta Vite successiva)
npm run build        # build di tutti i pacchetti e app
```

## Deploy consigliato

| App | Target | Note |
|-----|--------|------|
| Web | GitHub Pages / Vercel / Netlify | Build: `npm run build:web`, output: `apps/web/dist` |
| Admin | URL separato protetto | Non esporre pubblicamente senza auth |

Configura i secret `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nella CI (vedi `.github/workflows/deploy.yml`).

## Prossimi passi (roadmap)

Vedi [ROADMAP.md](./ROADMAP.md) per le evoluzioni pianificate: notifiche push, itinerari tematici, import da fonti esterne, PWA offline, test automatici.
