# Atlas Operazioni — guida gestore

Cartella Desktop per il lavoro quotidiano. La chat di sviluppo serve solo per modifiche al codice.

## Installazione (una tantum)

1. Dal progetto, apri `ops/desktop/installa-sul-desktop.bat`
2. Sul Desktop compare la cartella **Atlas Operazioni**
3. Apri **`APRI-QUESTO.html`** come punto di ingresso

## Cosa contiene

| Strumento | Funzione |
|-----------|----------|
| `APRI-QUESTO.html` | Pulsanti verso Control Center, mappa, scoperta |
| `Avvia-Control-Center.bat` | Admin locale (porta 5173) |
| `Avvia-Mappa.bat` | Mappa pubblica (porta 5174) |
| `Aggiorna-Fonti.bat` | `npm run collect` |
| `Importa-Eventi.bat` | Import CSV con anteprima |
| `Report-Copertura.bat` | `npm run report:gap` |

## Routine ogni 2 giorni (~5 min)

1. Lancia i 4 prompt (`PROMPT_RICERCA_EVENTI.md`)
2. **Control Center → Scoperta** → incolla ogni blocco → **Elabora** → **Pubblica**
3. Barra in alto: data sessione e numero blocchi incollati
4. Opzionale: **Aggiorna-Fonti.bat**

## Consultare lo storico eventi

**Control Center → Registro** — elenco completo con filtri per stato (in pubblicazione, storico, archiviati, in revisione), provincia, comune, date, categoria, fonte e ricerca testo. Da qui puoi **Modifica** (apre la mappa gestore sul pin), **Archivia** o **Esporta CSV** del risultato filtrato.

## Correggere un evento

**Control Center → Mappa** → clic sul pin → modifica → **Salva modifiche** (conferma) → Annulla/Ripeti se sbagli.

## Segnalazioni utenti

**Control Center → Segnalazioni** — ogni richiesta ha codice `ATL-...` e contatto. L'utente può inviare conferma WhatsApp (se configurato `VITE_ATLAS_OPS_WHATSAPP` in `apps/web/.env`).

## Migrazioni SQL richieste

- `004_manual_discovery.sql`
- `005_ops_submissions_audit.sql`
