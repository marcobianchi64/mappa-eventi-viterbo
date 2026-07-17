# Fonti eventi — Provincia di Viterbo (pilota)

Elenco operativo per popolamento manuale e automazione progressiva.
Ultimo aggiornamento: 2026-07-13.

## Legenda

| Modalità | Significato |
|----------|-------------|
| **AUTO-1** | Prima automazione (Fase 1) |
| **AUTO-2** | Automazione successiva |
| **MANUALE** | Inserimento/controllo umano |
| **SOCIAL** | Solo segnalazioni o revisione (no scraping) |

| Affidabilità | Significato |
|--------------|-------------|
| **A** | Fonte istituzionale o editoriale consolidata |
| **B** | Aggregatore affidabile |
| **C** | Utile ma layout variabile o aggiornamento irregolare |

---

## Priorità 1 — Automazione pilota (AUTO-1)

| # | Fonte | URL | Tipo | Aff. | Note |
|---|-------|-----|------|------|------|
| 1 | Comune di Viterbo — Eventi | https://comune.viterbo.it/vivere-il-comune/eventi/ | Istituzionale | A | Calendario strutturato, molti eventi |
| 2 | Tuscia Eventi | https://www.tusciaeventi.it/eventi/ | Aggregatore | B | Portale dedicato provincia, pagine evento |
| 3 | Eventi della Tuscia | https://www.eventidellatuscia.it/ | Aggregatore | B | Sagre, cultura, folklore |

---

## Priorità 2 — Automazione dopo pilota (AUTO-2)

| # | Fonte | URL | Tipo | Aff. | Note |
|---|-------|-----|------|------|------|
| 4 | ViterboToday — Eventi | https://www.viterbotoday.it/eventi/ | Editoriale | B | Articoli + sezione eventi |
| 5 | TusciaUp — Eventi | https://www.tusciaup.it/eventi/ | Editoriale | B | Verificare struttura pagine |
| 6 | Eventbrite — Viterbo | https://www.eventbrite.it/d/italy--viterbo/events/ | Piattaforma | B | Eventi privati, corsi, degustazioni |
| 7 | Teatro Unione Viterbo | https://www.teatrounione.it/ | Cultura | A | Programma stagione (verificare URL programma) |
| 8 | Provincia di Viterbo | https://www.provincia.viterbo.it/ | Istituzionale | A | Comunicati e appuntamenti |
| 9 | Visit Lazio — Viterbo | https://www.visitlazio.com/ | Regionale | A | Eventi di rilievo regionale |

---

## Priorità 3 — Manuale o connettore dedicato (MANUALE)

Comuni della provincia (sezioni Turismo/Eventi) — attivare progressivamente:

| Comune | URL (da verificare) |
|--------|---------------------|
| Bolsena | https://www.comune.bolsena.vt.it/ |
| Caprarola | https://www.comune.caprarola.vt.it/ |
| Civita di Bagnoregio | https://www.comune.civitadibagnoregio.vt.it/ |
| Montefiascone | https://www.comune.montefiascone.vt.it/ |
| Orte | https://www.comune.orte.vt.it/ |
| Soriano nel Cimino | https://www.comune.sorianonelcimino.vt.it/ |
| Tarquinia | https://www.comune.tarquinia.vt.it/ |
| Tuscania | https://www.comune.tuscania.vt.it/ |
| Vitorchiano | https://www.comune.vitorchiano.vt.it/ |

Altri:

| Fonte | URL | Note |
|-------|-----|------|
| TusciaWeb | https://www.tusciaweb.eu/ | Notizie con locandine, meno strutturato |
| TusciaItalia | https://www.tusciaitalia.it/ | Calendari tradizionali |
| Teatro San Leonardo | https://www.teatrosanleonardo.it/ | Programma indipendente |
| Tuscia Film Fest | https://www.tusciafilmfest.it/ | Festival stagionale |

---

## Social e Pro Loco (SOCIAL — non automatizzare in Fase 1)

- Pagine Facebook «Pro Loco [Comune]»
- Gruppo «Eventi Viterbo»
- Instagram organizzatori locali

**Strategia:** segnalazioni utenti + inserimento manuale da revisore.

---

## Regole import

1. Importare solo eventi con **data fine ≥ oggi** (o senza fine ma data inizio futura).
2. Eventi passati → **archiviazione**, mai cancellazione.
3. Ogni evento deve avere **fonte_id** e link alla pagina originale.
4. Duplicati tra fonti → motore qualità; versione canonica da fonte con affidabilità maggiore.

---

## Stato attivazione

| Fonte | Stato | Responsabile |
|-------|-------|--------------|
| Comune Viterbo | Da attivare | — |
| Tuscia Eventi | Da attivare | — |
| Eventi della Tuscia | Da attivare | — |
| Altre | In coda | — |
