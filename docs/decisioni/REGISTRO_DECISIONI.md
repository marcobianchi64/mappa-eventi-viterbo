# Registro delle Decisioni — Project Atlas

Decisioni consolidate. Formato: data | decisione | motivazione | conseguenze.

---

## 2026-07-13 — Criterio successo pilota Viterbo

**Decisione:** Il test Viterbo è superato quando l'offerta è **completa** (tutto ciò che realmente succede in provincia) e gli **automatismi** funzionano con intervento manuale minimo dopo le verifiche iniziali.

**Motivazione:** Priorità a qualità e copertura, non a metriche utenti o fatturato iniziale.

**Conseguenze:** Roadmap orientata a fonti + motore raccolta prima di marketing e monetizzazione seria.

---

## 2026-07-13 — Team e budget

**Decisione:** Sviluppo iniziale a cura di un solo operatore; in futuro supporto della figlia su fonti, revisione e verifica. Budget **minimo**, incrementabile solo a revenue da pubblicità/servizi.

**Conseguenze:** Stack serverless, hosting economico, automazione prioritaria rispetto a funzioni costose.

---

## 2026-07-13 — Fonti e aggregatori

**Decisione:** Ammessi siti che gi già aggregano eventi; importare solo eventi **non passati**; partire da 2–3 aggregatori + Comune per test automazione.

**Motivazione:** Copertura rapida e test del flusso automatico su fonti strutturate.

**Conseguenze:** Elenco in `docs/operativo/FONTI_VITERBO.md`.

---

## 2026-07-13 — Segnala evento

**Decisione:** Revisione manuale **solo** se l'evento non è già presente da fonti verificate. Contatto obbligatorio (email, WhatsApp o altro) per tracciabilità.

**Conseguenze:** Modello dati `segnalazioni` con campo contatto; deduplicazione prima della coda revisione.

---

## 2026-07-13 — Auto-pubblicazione

**Decisione:** Eventi da fonti affidabili che superano i controlli automatici possono essere pubblicati senza revisione; il resto va in coda.

**Conseguenze:** Campo `affidabilita` sulle fonti; regole nel motore qualità.

---

## 2026-07-13 — Categorie Alpha

**Decisione:** 6 macro-categorie: Musica, Cultura, Enogastronomia, Sport, Famiglie, Altri — **rivedibili** dopo esperienza a Viterbo.

**Conseguenze:** Non serve tassonomia fine al lancio; titolo/descrizione coprono il resto.

---

## 2026-07-13 — Monetizzazione test

**Decisione:** Preparare un solo prodotto test: **«Evento in evidenza»** (7 giorni), etichetta obbligatoria **«Promosso»**. Attivare quando contenuto e traffico lo consentono, non al day one.

**Motivazione:** Validare processo commerciale senza compromettere fiducia.

**Conseguenze:** Modulo campagne leggero in Fase 3 roadmap.

---

## 2026-07-13 — Lancio e forma giuridica

**Decisione:** Lancio indipendente (no partnership istituzionali obbligatorie). Gestione con **P.IVA personale**; società solo se fatturato sufficiente. Nome **Atlas provvisorio**.

**Conseguenze:** Architettura e dominio tecnico indipendenti dal brand finale.

---

## 2026-07-13 — Multilingua

**Decisione:** Italiano al lancio; inglese (almeno UI) in fase successiva se costi/complessità contenuti.

**Conseguenze:** Predisporre `locale` nei dati fin da subito.

---

## 2026-07-13 — Social come fonte

**Decisione:** Facebook/Pro Loco **non** in automazione Fase 1; gestione manuale o segnalazioni.

**Motivazione:** Scraping fragile e spesso non consentito.

**Conseguenze:** Priorità a siti web strutturati.
