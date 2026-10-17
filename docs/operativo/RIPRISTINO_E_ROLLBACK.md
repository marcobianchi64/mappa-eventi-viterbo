# Ripristino e rollback — Project Atlas

## 1. Ripristino codice locale

```bash
cd /percorso/mappa-eventi-viterbo
git fetch origin
git status
```

**Tornare a un commit noto:**

```bash
git checkout <branch-o-tag>
git pull
npm ci
npm run build
```

**Annullare modifiche non committate:**

```bash
git restore .
git clean -fd   # attenzione: rimuove file non tracciati
```

Punto di ripristino `main` legacy (solo HTML): commit `fda9230` su `origin/main`.

Punto di ripristino app monorepo: ultimo commit su `origin/cursor/filter-live-counts-d162` o tag release.

---

## 2. Ripristino ambiente (.env)

I file `.env` non sono in git. Tenerne **copia offline** (password manager o file cifrato).

Se persi:

1. Supabase → Settings → API → copiare URL e chiavi **anon** + **service_role**.
2. Ricreare `apps/web/.env`, `apps/admin/.env`, `packages/collector/.env` dagli `.env.example`.

---

## 3. Database Supabase

**Fase 0bis non introduce migrazioni distruttive.**

- Backup: Supabase Dashboard → Database → Backups (piano Pro) o export periodico tabelle critiche (`events`, `sources`).
- Rollback migration: eseguire solo SQL **additivo** inverso preparato a mano; non `DROP` senza backup.

---

## 4. GitHub Actions

**Disabilitare temporaneamente:**

Actions → selezionare workflow → … → Disable workflow.

**Secret compromessi:**

1. Supabase → rigenerare service_role (se necessario) e anon.
2. GitHub → aggiornare secrets.
3. Rigenerare `.env` locali.

**Cron che non parte:**

- Verificare che i file `.github/workflows/*.yml` siano sul branch **default**.
- Verificare secret `SUPABASE_SERVICE_ROLE_KEY` per collect.

---

## 5. Ripristino dati utilità (farmacie/cinema)

File: `apps/web/public/data/utilities/viterbo.json`

```bash
git checkout origin/cursor/filter-live-counts-d162 -- apps/web/public/data/utilities/viterbo.json
npm run sync:utilities
```

---

## 6. Contatti operativi

- Runbook giornaliero: [RIAVVIO_DOPO_PAUSA.md](./RIAVVIO_DOPO_PAUSA.md)
- Raccolta eventi: [RACCOLTA.md](./RACCOLTA.md)
