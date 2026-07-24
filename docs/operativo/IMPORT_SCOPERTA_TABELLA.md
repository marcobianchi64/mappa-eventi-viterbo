# Import tabella Scoperta (ChatGPT / markdown)

Se in **Scoperta** vedi «0 righe lette» o **Pubblica** non inserisce nulla nel Registro, usa questo percorso: salva la tabella in un file e importa dal terminale (connessione diretta al database, senza dipendere dal browser).

## 1. Salva la tabella

1. Copia **solo la tabella** (righe con `|`), dalla riga `stato | titolo | …` fino all’ultimo evento.
2. **Non** serve un campo separato per i link in calce: le righe `[1]: https://…` vengono **tagliate automaticamente** dal parser (v1.2.0+).
3. Incolla in un file, es. `Desktop/atlas-musica-2026.md`.

## 2. Configura la chiave (una volta)

In `packages/collector/.env` (o `.env` nella root se già usi l’import CSV):

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # chiave **service_role** da Supabase → Settings → API
```

Non usare la chiave `anon` pubblica.

## 3. Anteprima

Dalla root del progetto:

```bash
npm run import:discovery -- --dry-run Desktop/atlas-bolsena-2026.md
```

Controlla:

- `Righe lette dal parser` ≈ numero eventi nella tabella (es. 25–27)
- `Importati` in anteprima = eventi che verrebbero creati
- `Saltati (duplicato)` = già presenti nel DB (normale se ripeti l’import)

## 4. Import reale

```bash
npm run import:discovery -- Desktop/atlas-bolsena-2026.md
```

## 5. Verifica

1. Control Center → **Registro** → cerca **Bolsena** → devono comparire tutti i concerti.
2. **Mappa gestore** → contatore pin e zoom su Bolsena.
3. Mappa utente → filtro **60 giorni**, refresh.

## Scoperta nel browser (dopo `git pull` v1.1.9+)

1. Tab **Scoperta** → incolla tabella → **Elabora**.
2. Deve dire **«N righe lette»** (non zero).
3. **Pubblica** → messaggio con numero pubblicati ed eventuali errori per riga.

Se **Elabora** mostra 0 righe: la tabella nel campo è troncata o senza `|` → usa il file + `import:discovery`.
