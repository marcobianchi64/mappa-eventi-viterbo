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

---

## 2026-07-17 — Scoperta manuale assistita (pilota Viterbo)

**Decisione:** Per massimizzare la copertura della mappa nel pilota, integrare gli eventi non raggiunti dalle 5 fonti automatiche tramite **ricerca AI manuale** ogni ~2 giorni (4 prompt tematici), verifica umana in Excel, import CSV. L'automazione schedulata della discovery AI è **rinviata** all'espansione multi-provincia.

**Motivazione:** Le fonti automatiche coprono ~10–15 eventi; decine di eventi restano su Pro Loco, teatri e pagine comunali non ancora connesse. Facebook resta escluso (fragile). Il flusso manuale è rapido da avviare e tracciabile (`url_evento` + `url_fonte`).

**Conseguenze:**
- Template e prompt in `docs/operativo/`
- CLI `npm run import:events` con fonte `src-manual-discovery`
- Tabella `source_candidates` per siti da validare come futuri connettori
- Filtro mappa esteso a 60 giorni per il pilota estivo

---

## 2026-07-18 — Chat vs interfacce operative

**Decisione:** La chat di sviluppo serve solo per **modifiche, integrazioni e decisioni di prodotto**. Le operazioni ricorrenti (scoperta, import, revisione, collect) vivono in **interfacce** e nella cartella Desktop `Atlas Operazioni`.

**Motivazione:** L'operatore non deve ricordare comandi o tornare in chat per il lavoro quotidiano.

**Conseguenze:** `ops/desktop/`, Control Center ampliato, documentazione in `ATLAS_OPERAZIONI.md`.

---

## 2026-07-18 — Automazione verifiche scoperta

**Decisione:** Scarto automatico di **date passate** e **duplicati** (già in mappa). Il titolo sui pin è **accorciato dal codice** (`formatDisplayTitle`); nessun intervento manuale sui titoli. Verifica link HTTP in pipeline import (CLI); in admin, controllo manuale solo per link dubbi.

**Conseguenze:** `cleanTitle()` in import; tooltip mappa con titolo breve automatico.

---

## 2026-07-18 — Mappa gestore con modifica eventi

**Decisione:** Il Control Center include una **mappa amministratore** con click su pin → scheda modifica → conferma «Salvare modifiche?» e **Annulla/Ripeti** (undo/redo) sul form.

**Conseguenze:** Tab Mappa in admin; `updateEventAdmin` via Supabase autenticato.

---

## 2026-07-18 — Scoperta con sessione e incolla

**Decisione:** Tab **Scoperta** con barra sessione (data + conteggio blocchi incollati), textarea per output AI, elaborazione automatica e pubblicazione diretta.

**Conseguenze:** `parseMarkdownTables`, `localStorage` sessione, migrazione policy admin insert.

---

## 2026-07-18 — Segnalazioni utenti: tracciabilità

**Decisione:** Ogni segnalazione riceve un **codice riferimento** (`ATL-YYYYMMDD-XXXX`). Dopo l'invio, l'utente può aprire WhatsApp con messaggio precompilato verso il numero operazioni (`VITE_ATLAS_OPS_WHATSAPP`) per conferma e tracciabilità.

**Motivazione:** Sicurezza e audit trail senza login utente.

**Conseguenze:** Migrazione `005_ops_submissions_audit.sql`; campo `reference_code` su `event_submissions`.
