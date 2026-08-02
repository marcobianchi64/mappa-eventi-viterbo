# Cover segnaposto (fonti libere)

Immagini in `/{categoria}/01.jpg` … `10.jpg`, usate quando l'evento non ha `image_url`.

## Scaricare / aggiornare

```bash
npm run fetch:covers
```

Opzionale: `PEXELS_API_KEY` in `packages/collector/.env` (gratis su https://www.pexels.com/api/).

Senza chiave Pexels lo script usa **Wikimedia Commons** (licenze libere).

## Licenze

Dettaglio file per file in `manifest.json` (titolo, fonte, licenza, URL pagina).

## UI

Le foto sono mostrate **desaturate e schiarite** via CSS (`category-cover-photo`) per indicare che sono segnaposto, non locandine ufficiali.
