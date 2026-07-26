# Roadmap Project Atlas

**Strategia prodotto (automazione, concorrenza, immagini):** [strategia/POSIZIONAMENTO_E_AUTOMAZIONE.md](./strategia/POSIZIONAMENTO_E_AUTOMAZIONE.md)

## Fase 1 — Fondamenta (completata in questa riprogettazione)

- [x] Monorepo modulare con TypeScript
- [x] Package condiviso tipi e logica dominio
- [x] Client Supabase centralizzato
- [x] Migrazione funzionalità mappa e admin
- [x] Documentazione architettura e schema DB
- [x] CI build e deploy GitHub Pages

## Fase 2 — Sicurezza e qualità dati

- [ ] Applicare policy RLS su Supabase (vedi `supabase/schema.sql`)
- [ ] Validazione lato server (Edge Functions o trigger DB)
- [ ] Rate limiting su inserimento eventi
- [ ] Audit log modifiche admin
- [ ] Test unitari su `@atlas/core` e test E2E mappa

## Fase 3 — Esperienza utente

- [ ] PWA con service worker e cache eventi
- [ ] Notifiche promemoria reali (Web Push / email)
- [x] Filtri per categoria e vista Calendario (mappa + elenco a pagina)
- [ ] Itinerari tematici e percorsi multi-evento
- [ ] Internazionalizzazione (IT/EN)

## Fase 4 — Scalabilità territoriale

- [ ] Configurazione multi-territorio (non solo Viterbo) — vedi [POSIZIONAMENTO_E_AUTOMAZIONE.md](./strategia/POSIZIONAMENTO_E_AUTOMAZIONE.md) §7
- [ ] Import automatico da RSS e API/HTML comunali (social solo con policy e costi dedicati)
- [ ] Arricchimento immagini in pipeline server (alternativa a `fix:images` manuale)
- [ ] Dashboard analytics per organizzatori
- [ ] API pubblica read-only per partner

## Fase 5 — Accesso e monetizzazione (opzionale)

- [ ] Modulo biglietti / prenotazioni
- [ ] Profili organizzatori verificati
- [ ] Eventi in evidenza sponsorizzati
