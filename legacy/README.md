# Prototipo legacy (deprecato)

Questi file sono la versione **0.6.4** monolitica di Project Atlas, generata inizialmente come singoli HTML.

| File | Ruolo |
|------|-------|
| `index.html` | Mappa pubblica eventi |
| `control-center.html` | Pannello moderazione admin |

**Non usare per nuovo sviluppo.** La versione attuale è in:

- `apps/web` — mappa pubblica
- `apps/admin` — control center

Le credenziali Supabase erano hardcoded in questi file; nella nuova architettura vanno in variabili d'ambiente (`.env`).
