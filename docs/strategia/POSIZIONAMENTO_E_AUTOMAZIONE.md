# Posizionamento, automazione e superamento della concorrenza

Documento di riferimento per **come** Project Atlas cresce in volume senza perdere il vantaggio qualitativo attuale.  
**Obiettivo:** non la perfezione assoluta, ma **essere chiaramente migliori** dei portali e delle mappe generiche sulla provincia (e, in espansione, su territori analoghi).

Vedi anche: [ROADMAP.md](../ROADMAP.md), [RACCOLTA.md](../operativo/RACCOLTA.md), [WORKFLOW_SCOPERTA_MANUALE.md](../operativo/WORKFLOW_SCOPERTA_MANUALE.md), [REGISTRO_DECISIONI.md](../decisioni/REGISTRO_DECISIONI.md).

---

## 1. Cosa ci distingue oggi (da difendere)

La “ricchezza” percepita dagli utenti non è solo il numero di righe in database, ma:

| Leva | Cosa fa Atlas | Cosa fa spesso la concorrenza |
|------|----------------|-------------------------------|
| **Territorio** | Comuni, frazioni, geocoding VT, pin allineati in lettura | Pin sul capoluogo o coordinate casuali |
| **Affidabilità luogo** | Confidenza pin / blocco **Guidami** se incerto | Navigazione verso punti sbagliati |
| **Duplicati** | Dedupe mappa e Scoperta (stessa sagra, reimport) | Stesso evento due o tre volte |
| **Scoperta curata** | Tabella AI → revisione → pubblicazione con regole | Solo scraping grezzo |
| **Esperienza** | Mappa + **Calendario** a pagina, scheda evento, filtri periodo | Solo lista o solo mappa statica |

In automazione **non** si sacrificano queste leve: si aggiunge volume su un binario controllato.

---

## 2. Due binari: automatico e assistito

### Binario A — Raccolta automatica

- **Fonti:** RSS, HTML listing, calendari comunali, aggregatori (vedi `FONTI_VITERBO.md`, `npm run collect`).
- **Qualità attesa:** media; eventi strutturati, date e testi spesso buoni, luogo e immagine variabili.
- **Regole già in codice:** scarto eventi passati, deduplicazione, `verified` secondo policy fonte, geocoding con cache.
- **Ruolo:** coprire **molti** eventi con intervento umano minimo dopo la messa a punto delle fonti.

### Binario B — Scoperta assistita (AI + umano)

- **Flusso:** prompt → tabella → Control Center **Scoperta** → anteprima → **Salva sulla mappa** (vedi `WORKFLOW_SCOPERTA_MANUALE.md`).
- **Qualità attesa:** alta; adatta a sagre di paese, concerti piccoli, casi che il collector non raggiunge.
- **Ruolo:** mantenere il **livello** che gli utenti vedono oggi e colmare i buchi del binario A.

**Principio:** pubblicazione “in evidenza” sulla mappa pubblica per ciò che passa le regole (date, luogo, dedupe); il resto in coda revisione o archivio — non abbassare il livello per riempire la mappa.

---

## 3. Cosa significa “superare la concorrenza”

Non serve avere **ogni** evento sui social. Serve, per il territorio scelto:

1. **Più eventi pertinenti** dei generalisti (stessi comuni, stesso periodo).
2. **Meno errori fastidiosi** (doppioni, pin a Viterbo per eventi a Bolsena, Guidami verso il vuoto).
3. **Scoperta più comoda** (mappa + calendario + scheda, link ufficiale quando c’è).

I portali locali spesso vincono sul **brand**; Atlas può vincere su **completezza operativa** e **affidabilità del pin** per chi esce dal divano.

---

## 4. Piccoli eventi “solo social”

| Approccio | Costo | Quando |
|-----------|--------|--------|
| **Scoperta + segnalazioni utenti** | Basso (tempo operatore) | Pilota e prime 4 province |
| **Partnership Pro Loco / Comuni** (email, CSV, link calendario) | Relazioni, non SaaS | Medio termine |
| **Monitoraggio social** (API o servizi terzi) | Abbonamento | Solo se il volume giustifica il costo |
| **Scraping Facebook/Instagram** senza API | Fragile / ToS | **Non** in Fase 1 automazione (cfr. registro decisioni 2026-07-13) |

**Obiettivo realistico:** battere i portali su **eventi di comunità** grazie a Scoperta e segnalazioni, non replicare subito l’intero feed social.

---

## 5. Servizi a pagamento (opzionali, incrementali)

Nessuno è **obbligatorio** per restare sopra la concorrenza locale. Utili quando si scala:

| Servizio / capacità | A cosa serve | Priorità |
|---------------------|--------------|----------|
| **Job server / Edge Function** (es. Supabase) | Fetch `og:image` e arricchimento in publish senza `fix:images` manuale | Media |
| **Geocoding commerciale** | Più precisione fuori VT / volumi alti | Bassa finché basta Nominatim + catalogo comuni |
| **CDN / proxy immagini** | Immagini sempre visibili se i siti bloccano hotlink | Bassa |
| **API aggregatori o social** | Copertura eventi solo su piattaforme chiuse | Valutare a revenue o copertura stabile |

Regola budget: **prima** automazione fonti strutturate e Scoperta; **poi** servizi che riducono lavoro manuale ripetitivo (immagini, code).

---

## 6. Immagini degli eventi (locandine)

Fa parte della qualità percepita (Calendario, scheda, tooltip).

| Metodo | Dove | Note |
|--------|------|------|
| Campo **`image_url`** in DB | Mappa, Calendario, scheda | Già supportato |
| Collector (es. ViterboToday) | Import listing | Miniatura da HTML card |
| **`npm run fix:images`** | Dopo publish / batch | Legge `event_url`, estrae Open Graph; da finestra progetto, `.env` collector |
| Import discovery CLI | `import-discovery` | Arricchimento in inserimento |
| Form segnalazione utente | URL immagine opzionale | Manuale |

**Limite attuale:** il Control Center nel browser non può leggere HTML di siti terzi (CORS); dopo **Salva sulla mappa** usare `fix:images` o (futuro) job lato server.

Senza immagine: fallback icona categoria — **accettabile**; non bloccare la pubblicazione.

---

## 7. Espansione multi-provincia (4+ aree “tipo Viterbo”)

Stesso schema:

1. Territorio in DB (`territory_id`, comuni, geocoding dedicato o estensione catalogo).
2. Fonti AUTO per provincia + Scoperta con prompt territoriali.
3. Stesse regole dedupe, confidenza luogo, versione app visibile in UI.
4. Immagini: stesso `fix:images` + connettori listing; nessun obbligo di CDN.

---

## 8. Checklist operativa (non in chat)

- [ ] `npm run collect` / Actions schedulata per fonti AUTO
- [ ] Scoperta a intervalli regolari per buchi noti
- [ ] `npm run report:duplicates` / `report:compare` se anomalie
- [ ] `npm run fix:images` dopo batch di pubblicazioni con `event_url`
- [ ] `npm run verify:golden` (e `npm run verify` in CI) prima di rilasci
- [ ] Verifica versione app in mappa (`ATLAS_VERSION`) dopo ogni rilascio

---

*Ultimo aggiornamento strategico: luglio 2026 — allineato a pilota Viterbo e release app v1.4.x.*
