# Supabase — Atlas

## Ordine di esecuzione (SQL Editor su Supabase)

1. `schema.sql` — tabella events base + RLS
2. `migrations/001_fase0_territories_sources.sql` — territori, fonti, segnalazioni
3. `migrations/002_collector.sql` — external_id, log sincronizzazioni
4. `migrations/003_fase2_auto_sources.sql` — AUTO-2 ViterboToday/TusciaUp
5. `migrations/007_aim_registry.sql` — luoghi censiti, osservazioni, alert operativi
6. `migrations/008_place_registry_quality.sql` — qualità anagrafica luoghi
7. `migrations/009_pharmacy_registry_source.sql` — fonte autorevole farmacie
8. `migrations/010_experiences_foundation.sql` — offerte ripetibili, distinte dagli eventi
9. `seed_viterbo.sql` — pilota provincia di Viterbo
10. `seed_places_vt.sql` — cinema censiti provincia VT
11. `seed_pharmacies_vt.sql` — anagrafica farmacie attive provincia VT

## Note

- Se `events` esiste già, la migration aggiunge colonne e aggiorna il vincolo categorie.
- Le policy RLS richiedono login Supabase Auth per il Control Center.
- Dopo il seed avrai 6 fonti pilota + gerarchia territorio IT → Lazio → Viterbo.
- Rigenera l'anagrafica farmacie con `npm run import:pharmacy-registry -w @atlas/collector`.
