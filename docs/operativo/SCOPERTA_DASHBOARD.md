# Scoperta dalla dashboard (senza Blocco note)

Per Viterbo e, in futuro, altre province: **tutto nel Control Center**, tab **Scoperta**.

## Flusso (2 minuti per blocco)

1. In ChatGPT/Gemini: chiedi la tabella con le colonne Atlas (`stato`, `titolo`, `comune`, `data_inizio`, …).
2. **Copia** l’intera tabella (puoi includere le righe `[1]: https://…` in calce).
3. Control Center → **Scoperta**:
   - **Incolla** nel riquadro grande, oppure
   - **Trascina** un file `.md`/`.txt` se la chat ti permette di scaricare/esportare, oppure
   - **Carica file…** (stesso effetto del trascina).
4. Controlla sotto il campo: `circa 27 righe evento nel testo`.
5. Clic **Elabora e pubblica** → conferma → fine.
6. Verifica **Registro** (comune) e **Mappa gestore** (contatore pin).

## Controlli automatici

| Messaggio | Significato |
|-----------|-------------|
| `27 = 27` righe nel testo / parser | Tabella letta per intero |
| `Pronti per comune: Bolsena (11)` | Quanti nuovi verranno scritti |
| `Già in DB (duplicati)` | Normale se ripubblichi lo stesso blocco |

Se **righe nel testo > righe lette**: incolla incompleto → usa **Carica file** (esporta dalla chat in un unico file, senza aprire Blocco note per modifiche manuali).

## Più province

Ogni blocco è indipendente: dopo un blocco, **Nuovo blocco** e passa alla provincia successiva (stesso flusso). Il territorio resta configurato per il pilota Viterbo (`IT-VT`); l’espansione multi-provincia userà lo stesso tab con selezione territorio.

## Riserva tecnica (solo se la dashboard fallisce)

`npm run import:discovery -- file.md` con service role in `packages/collector/.env` — non serve per l’uso quotidiano se Scoperta mostra 27/27.
