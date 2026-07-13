# Roadmap — Project Atlas

Orientamento: Viterbo (pilota) → provincia completa → regione → nazionale → internazionale.

---

## Fase 0 — Alpha consolidata

**Obiettivo:** Base modulare stabile, gestibile da 1–2 persone.

- [x] Modello dati: Territorio, Fonte, Evento, Segnalazione
- [x] API layer (`@atlas/supabase-client`)
- [x] Frontend modulare (mappa, scheda, filtri, ricerca)
- [x] Control Center v2: fonti, eventi, segnalazioni
- [x] Pagina evento dedicata (`event.html`)
- [x] Popolamento manuale fonti Viterbo (seed SQL)
- [x] Segnala evento con contatto obbligatorio e dedup

**Criterio uscita:** Mappa usabile ogni giorno; contenuti gestibili senza toccare codice.

---

## Fase 1 — Automazione pilota

**Obiettivo:** Automatismi funzionanti; revisione manuale sulle eccezioni.

- [x] Motore raccolta: Comune Viterbo + Tuscia Eventi + Eventi della Tuscia
- [x] Normalizzazione e scarto eventi passati
- [x] Motore qualità: validazione campi, geocodifica, dedup base
- [x] Scheduler e log acquisizioni (GitHub Actions + `npm run collect`)
- [x] Auto-pubblicazione per fonti affidabili

**Criterio uscita:** ≥1 fonte si aggiorna da sola; revisione manuale <20% eventi nuovi.

---

## Fase 2 — Completezza Viterbo

**Obiettivo:** Superare il test pilota (offerta completa, intervento minimo).

- [ ] Espansione fonti (AUTO-2 + comuni principali)
- [ ] Filtro territorio in UI
- [ ] Ricerca per comune/località
- [ ] Archiviazione eventi conclusi
- [ ] Checklist settimanale operativa

**Criterio uscita:** Copertura provinciale verificata da team; coda revisione quasi vuota.

---

## Fase 3 — Monetizzazione test

**Obiettivo:** Validare processo «Evento in evidenza» / «Promosso».

- [ ] Modello campagne promozionali
- [ ] Etichetta UI obbligatoria
- [ ] Flusso attivazione manuale (P.IVA)
- [ ] Metriche base (visualizzazioni, click)

**Criterio uscita:** Almeno 1 campagna test completata end-to-end.

---

## Fase 4 — Beta territoriale

- [ ] Province limitrofe o altra area Lazio
- [ ] Ruoli CC: Admin + Revisore
- [ ] Onboarding fonti ripetibile

---

## Fase 5 — Scala nazionale

- [ ] Multi-territorio nel motore raccolta
- [ ] Caching e performance
- [ ] Multilingua UI (inglese)

---

## Fase 6 — Internazionale

- [ ] Gerarchia territorio multi-paese
- [ ] Conformità e localizzazione avanzata
