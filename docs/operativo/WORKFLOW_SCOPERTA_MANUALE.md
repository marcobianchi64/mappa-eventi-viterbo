# Workflow scoperta manuale eventi

Fase pilota Viterbo: integrare la mappa con eventi non coperti dalle 5 fonti automatiche, senza scraping Facebook.

## Ritmo consigliato

| Frequenza | Attività |
|-----------|----------|
| Ogni **2 giorni** | Lancio dei 4 prompt tematici (`PROMPT_RICERCA_EVENTI.md`) |
| Stesso giorno | Merge tabelle in Excel, dedup visivo, verifica link |
| Dopo verifica | Export CSV righe `ok` → `npm run import:events` |
| Settimanale | Revisione tabella «Fonti scoperte» per nuovi connettori |

Il primo blocco richiede più tempo (baseline ~40–80 eventi). I cicli successivi aggiungono solo righe nuove.

## Passo 1 — Raccolta AI

1. Apri `docs/operativo/PROMPT_RICERCA_EVENTI.md`.
2. Esegui i 4 prompt (sagre, musica, cultura, sport/famiglie).
3. Incolla ogni tabella in un foglio dello stesso file Excel.

**Colonne obbligatorie** (ordine del template):

`stato` · `organizzatore` · `titolo` · `comune` · `luogo` · `data_inizio` · `data_fine` · `orario` · `url_evento` · `url_fonte` · `tipo_fonte` · `categoria` · `note`

## Passo 2 — Verifica umana

Per ogni riga:

- [ ] `url_evento` apre una pagina coerente con titolo e data
- [ ] Comune è nella provincia di Viterbo
- [ ] Data non è passata
- [ ] Non è già sulla mappa (cerca per titolo/comune)

**Stati:**

| stato | Significato |
|-------|-------------|
| *(vuoto)* | Da rivedere |
| `ok` | Verificato, pronto per import |
| `scartato` | Duplicato, errato o non pubblicabile |

## Passo 3 — Fonti scoperte (parallelo)

Quando un prompt segnala un sito utile (calendario Pro Loco, teatro, comune), annotalo in `TEMPLATE_FONTI_SCOPERTE.csv`:

- `stato`: `da_validare` → dopo test manuale `ok` o `scartato`
- Fonti `ok` valide per futuri connettori automatici (Fase 2b+)

## Passo 4 — Export e import

1. Filtra righe con `stato = ok`.
2. Salva come CSV UTF-8, separatore `;` (Excel Italia).
3. Dal progetto:

```bash
# Anteprima senza scrivere su DB
npm run import:events -- --dry-run docs/operativo/mieventi.csv

# Import reale (pubblica eventi verificati)
npm run import:events -- docs/operativo/mieventi.csv

# Registra anche url_fonte come candidati fonte (tabella source_candidates)
npm run import:events -- --register-sources docs/operativo/mieventi.csv
```

4. Ricarica la mappa (`npm run dev`) e controlla con filtro **60 giorni**.

## Passo 5 — Automazione collector

```bash
npm run collect   # aggiorna le 5 fonti automatiche
```

Eseguire **dopo** l'import manuale: il collector non sovrascrive gli eventi manuali (fonte diversa).

## Comandi utili

```bash
npm run report:gap    # conteggio eventi per comune/categoria (prossimi 60 gg)
```

## Cosa non fare in questa fase

- Scraping Facebook / Instagram
- Import di righe senza `stato = ok`
- Automazione schedulata dei prompt AI (prevista solo in espansione multi-provincia)

Vedi anche: `docs/decisioni/REGISTRO_DECISIONI.md` (decisione 2026-07-17).
