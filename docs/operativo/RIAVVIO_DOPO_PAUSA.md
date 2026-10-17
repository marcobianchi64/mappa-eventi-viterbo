# Riprendere Atlas dopo mesi di inattività

Vedi anche: [FASE_0BIS_OPERATIVITA.md](./FASE_0BIS_OPERATIVITA.md) (automazioni GitHub, secret, merge su `main`) e [RIPRISTINO_E_ROLLBACK.md](./RIPRISTINO_E_ROLLBACK.md).

## Perché farmacie, cinema e eventi sono vuoti o vecchi

| Dato | Dove vive | Chi lo aggiorna |
|------|-----------|-----------------|
| **Farmacie / cinema** | File `apps/web/public/data/utilities/viterbo.json` | `npm run sync:utilities` (locale o GitHub Actions) |
| **Eventi** | Database Supabase | `npm run collect` (locale o GitHub Actions) |
| **Control Center** | Legge Supabase (serve **login** email) | Non “si alimenta da solo”: mostra ciò che c’è in DB |

Gli **automatismi GitHub** (cron giornaliero) funzionano **solo** se:

1. I file `.github/workflows/collect.yml` e `sync-utilities.yml` sono sul branch **default** del repo (oggi spesso è `main`, ma lì manca ancora l’app completa).
2. Nei **Secrets** del repository GitHub ci sono `VITE_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.

Se il codice è solo su branch `cursor/...` e non su `main`, **nessun cron parte** — è normale dopo mesi senza merge.

---

## Ripresa rapida sul tuo PC (30 minuti)

### Una tantum — chiave collector

1. Copia `packages/collector/.env.example` → `packages/collector/.env`
2. In Supabase → **Settings → API** copia la chiave **`service_role`** (segreta, non la anon).
3. Nel file `.env` del collector:

```env
SUPABASE_URL=https://gdyhkuvrncztjguvxofg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...la_tua_service_role...
```

### Comandi (Prompt dei comandi, cartella progetto)

```cmd
cd C:\Users\comun\Desktop\EVENTI.COM\ATLAS\Projects\mappa-eventi-viterbo
git pull
npm run sync:utilities
npm run collect
```

Oppure doppio clic su **`ops\desktop\Riprendi-Automatismi.bat`** (dopo `installa-sul-desktop.bat`).

Poi **Ctrl+F5** sulla mappa. Per farmacie/cinema solo: **`Aggiorna-Utilita.bat`**.

### Control Center

```cmd
npm run dev:admin
```

Apri l’URL indicato (es. `http://localhost:5174`), **login con email** amministratore.

---

## Riattivare GitHub Actions (automatismo vero)

1. **Merge** su `main` del branch che contiene app + workflows (es. `cursor/filter-live-counts-d162`).
2. GitHub → repo → **Settings → Secrets and variables → Actions**:
   - `VITE_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. **Actions** → workflow **Atlas Collector** → **Run workflow** (test manuale).
4. **Actions** → **Atlas Utility Sync** → **Run workflow**.

Dopo il merge, il cron giornaliero riparte da solo.

---

## Se `collect` fallisce

- Chiave `service_role` errata o mancante.
- Migration `002_collector.sql` non eseguita su Supabase.
- Fonte esterna temporaneamente offline (riprovare più tardi).

## Se farmacie/cinema restano vuoti in mappa

- Esegui `npm run sync:utilities` e verifica che `apps/web/public/data/utilities/viterbo.json` abbia `dutyDate` di oggi.
- Riavvia `npm run dev` e ricarica con **Ctrl+F5**.
