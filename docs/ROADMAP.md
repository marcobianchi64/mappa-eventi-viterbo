# Roadmap Project Atlas

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
- [ ] Filtri per categoria e comune
- [ ] Itinerari tematici e percorsi multi-evento
- [ ] Internazionalizzazione (IT/EN)

## Fase 4 — Scalabilità territoriale

- [ ] Configurazione multi-territorio (non solo Viterbo)
- [ ] Import automatico da RSS, Facebook Events, API comunali
- [ ] Dashboard analytics per organizzatori
- [ ] API pubblica read-only per partner

## Fase 5 — Accesso e monetizzazione (opzionale)

- [ ] Modulo biglietti / prenotazioni
- [ ] Profili organizzatori verificati
- [ ] Eventi in evidenza sponsorizzati
