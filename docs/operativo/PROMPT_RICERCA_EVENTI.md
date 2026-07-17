# Prompt ricerca eventi — Provincia di Viterbo

Workflow pilota: **4 prompt tematici** da lanciare ogni ~2 giorni (Google AI, ChatGPT, Perplexity, ecc.). Non usare un unico mega-prompt: ogni tema ha fonti e lessico diversi.

## Regole anti-allucinazione (valide per tutti i prompt)

1. Includi **solo eventi futuri** (da oggi in poi) nella provincia di Viterbo.
2. Per ogni riga indica **url_evento** (pagina dell'evento) e **url_fonte** (sito/calendario da cui l'hai trovato).
3. Se non trovi un link diretto all'evento, **non inventare** l'URL: lascia `url_evento` vuoto e segnala in `note`.
4. Se la data è incerta, scrivi `data_inizio` come intervallo testuale in `note` e lascia la cella data vuota.
5. Non limitarti ai portali già noti: cerca anche **nuovi siti** (Pro Loco, teatri, associazioni, comuni, festival).
6. Output richiesto: **tabella markdown** con le colonne del file `TEMPLATE_EVENTI.csv` (stesso ordine).

---

## Prompt 1 — Sagre e enogastronomia

```
Cerca eventi di ENOGastronomia, sagre, degustazioni, mercati del gusto nella provincia di Viterbo (Lazio, Italia) nei prossimi 60 giorni.

Cerca su: siti Pro Loco, pagine comuni, portali sagre, agriturismi, cantine, festival del cibo — non solo i grandi aggregatori.

Per ogni evento futuro trovato, restituisci una tabella markdown con queste colonne (in questo ordine):
stato | organizzatore | titolo | comune | luogo | data_inizio | data_fine | orario | url_evento | url_fonte | tipo_fonte | categoria | note

Regole:
- stato: lascia vuoto (lo compilo io)
- categoria: usa sempre "food" o "enogastronomia"
- data_inizio/data_fine: formato GG/MM/AAAA se noto
- url_evento: link alla pagina specifica dell'evento (obbligatorio se esiste)
- url_fonte: link al calendario o sito dove hai trovato l'evento
- tipo_fonte: es. pro_loco, comune, portale, agriturismo
- Non includere eventi passati. Non inventare URL.
```

---

## Prompt 2 — Musica e concerti

```
Cerca concerti, festival musicali, DJ set, jam session, musica dal vivo nella provincia di Viterbo (Lazio) nei prossimi 60 giorni.

Cerca su: locali, piazze, festival estivi, programmi teatri, siti Pro Loco, pagine Facebook **pubbliche** solo se linkano a pagine web esterne — preferisci sempre siti con URL stabile.

Tabella markdown, colonne:
stato | organizzatore | titolo | comune | luogo | data_inizio | data_fine | orario | url_evento | url_fonte | tipo_fonte | categoria | note

Regole:
- categoria: "music" o "musica"
- Includi anche eventi in paesi piccoli (Bolsena, Montefiascone, Tuscania, ecc.)
- Se trovi solo un post social senza pagina evento, metti l'URL in note e lascia url_evento vuoto
- Non inventare date o luoghi
```

---

## Prompt 3 — Cultura, teatro, mostre

```
Cerca eventi culturali nella provincia di Viterbo: teatro, cinema, mostre, musei, libri, spettacoli, visite guidate, rievocazioni storiche — prossimi 60 giorni.

Cerca su: teatri (es. Caffeina, Unione), musei, biblioteche, comuni, fondazioni, rassegne estive.

Tabella markdown:
stato | organizzatore | titolo | comune | luogo | data_inizio | data_fine | orario | url_evento | url_fonte | tipo_fonte | categoria | note

Regole:
- categoria: "culture" o "cultura"
- Per rassegne pluri-giornaliere indica data_inizio e data_fine
- url_fonte: il sito del teatro/museo/comune, non solo l'aggregatore
```

---

## Prompt 4 — Sport e famiglie

```
Cerca eventi sportivi e per famiglie/bambini nella provincia di Viterbo nei prossimi 60 giorni: tornei, manifestazioni podistiche, ciclismo, attività outdoor, laboratori bambini, feste paesane family-friendly.

Tabella markdown:
stato | organizzatore | titolo | comune | luogo | data_inizio | data_fine | orario | url_evento | url_fonte | tipo_fonte | categoria | note

Regole:
- categoria: "sport" oppure "families" / "famiglie"
- Includi eventi gratuiti e a pagamento
- Non confondere sagre (food) con eventi famiglia se non c'è attività dedicata ai bambini
```

---

## Dopo la ricerca

1. Copia le 4 tabelle in un unico foglio Excel/Google Sheet (vedi `WORKFLOW_SCOPERTA_MANUALE.md`).
2. Verifica ogni riga: apri `url_evento`, controlla data e luogo.
3. Imposta `stato`: `ok` | `scartato` | lascia vuoto se da rivedere.
4. Esporta solo le righe `ok` in CSV (separatore `;`) e importa con `npm run import:events`.
