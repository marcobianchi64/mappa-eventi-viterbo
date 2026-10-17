# Fase 0bis — Affidabilità operativa (Project Atlas)

**Obiettivo:** automazioni GitHub e routine locali affidabili, senza cambiare il prodotto utente.

**Stato repository (aggiornato dopo merge 0bis su `main`, commit `5869548`):**

| Branch | Contenuto |
|--------|-----------|
| `origin/main` | Monorepo Atlas (web, admin, collector), workflow Actions, legacy in `legacy/` |
| Branch `cursor/*` | Sviluppo feature; allineare con `main` prima di nuove PR |

**Cron:** `collect` (06:00 UTC) e `sync-utilities` (05:30 UTC) partono solo su `main` e richiedono secret configurati; dopo il merge eseguire almeno un **Run workflow** manuale per validare (vedi checklist B).

---

## Credenziali — protezione

| File | Chiavi | Mai committare |
|------|--------|----------------|
| `apps/web/.env` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Sì (in `.gitignore`) |
| `apps/admin/.env` | come web | Sì |
| `packages/collector/.env` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Sì |

**GitHub Actions → Settings → Secrets and variables → Actions:**

| Secret | Usato da |
|--------|----------|
| `VITE_SUPABASE_URL` | CI build, Deploy Pages |
| `VITE_SUPABASE_ANON_KEY` | CI build, Deploy Pages |
| `SUPABASE_SERVICE_ROLE_KEY` | Workflow `Atlas Collector` |

La **service_role** non va mai nel frontend né in log pubblici.

Verifica locale: `npm run verify:automation` (controlla che nessun `.env` sia tracciato da git).

---

## Procedura di ripristino (rollback)

Vedi [RIPRISTINO_E_ROLLBACK.md](./RIPRISTINO_E_ROLLBACK.md).

In sintesi:

1. **Codice:** `git checkout <branch-noto-buono>` (es. tag o commit prima del merge).
2. **Database:** le migrazioni Supabase non vanno annullate in 0bis; in futuro solo migration additive.
3. **GitHub:** disabilitare temporaneamente workflow da Actions → workflow → Disable; rimuovere secret solo se compromessi (rigenerare su Supabase).

---

## Checklist Fase 0bis (operatore)

### A. Locale

1. `git checkout cursor/filter-live-counts-d162` (o branch release approvato)
2. `git pull`
3. `npm install`
4. Copiare `.env.example` → `.env` (web, admin, collector)
5. `npm run verify:automation`
6. `npm run typecheck` e `npm run build`
7. `npm run check:supabase` (con anon key reale)
8. `npm run sync:utilities`
9. `npm run collect` (con service_role reale)

### B. GitHub (dopo merge su main — solo con approvazione)

1. Configurare i 3 secret (tabella sopra).
2. Actions → **Atlas Collector** → Run workflow → verde.
3. Actions → **Atlas Utility Sync** → Run workflow → commit dati o “nessuna modifica”.
4. Attendere 24h e verificare che il cron sia partito (tab Runs).

### C. Merge su `main` (richiede conferma progetto)

**Non eseguire senza OK esplicito.**

1. Aprire PR da branch app (es. `cursor/ops-phase-0bis-d162`) verso `main`.
2. Verificare CI verde sulla PR.
3. Backup: annotare commit SHA corrente di `main` (`fda9230` al momento della verifica 0bis).
4. Merge PR.
5. Abilitare GitHub Pages se si usa deploy (workflow `Deploy Web to GitHub Pages`).
6. Eseguire checklist B.

---

## Test automatici associati a 0bis

| Comando | Cosa verifica |
|---------|----------------|
| `npm run verify:automation` | Workflow presenti, `.gitignore`, assenza `.env` in git |
| `npm run verify:core` | Suite verify senza Playwright |
| CI su PR/push `cursor/**` | typecheck, ui-scale, build, verify:automation, verify:core |

---

## Criteri di completamento Fase 0bis

- [x] Documentazione operativa aggiornata (questo file + ripristino)
- [x] CI esegue verify automation + core su `main` (push post-merge)
- [x] Workflow collect/sync con controllo secret esplicito
- [x] Merge su `main` (rollback: commit `fda9230`, vedi RIPRISTINO)
- [ ] Primo run manuale **Atlas Collector** e **Atlas Utility Sync** su `main` con esito verde *(operatore GitHub UI)*

---

## Dopo 0bis

**Fase 1 (Radar)** — solo su nuova autorizzazione: migrazioni 011+, discovery v1, fonti da DB.
