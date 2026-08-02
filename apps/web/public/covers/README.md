# Cover segnaposto

Tutte le categorie usano **icona** (gradiente + emoji) quando manca la locandina reale.

Gli asset in `food/`, `culture/`, `music/` restano per eventuale riuso futuro; l'app non li carica.

## Scaricare / aggiornare le foto

```bash
npm run fetch:covers
npm run fetch:covers -- --force --only=culture,music
```

Opzionale: `PEXELS_API_KEY` in `packages/collector/.env`.

Licenze in `manifest.json`.
