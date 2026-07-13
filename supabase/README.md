# Supabase — Atlas

## Ordine di esecuzione (SQL Editor su Supabase)

1. `schema.sql` — tabella events base + RLS
2. `migrations/001_fase0_territories_sources.sql` — territori, fonti, segnalazioni
3. `migrations/002_collector.sql` — external_id, log sincronizzazioni
4. `seed_viterbo.sql` — pilota provincia di Viterbo

## Note

- Se `events` esiste già, la migration aggiunge colonne e aggiorna il vincolo categorie.
- Le policy RLS richiedono login Supabase Auth per il Control Center.
- Dopo il seed avrai 6 fonti pilota + gerarchia territorio IT → Lazio → Viterbo.
