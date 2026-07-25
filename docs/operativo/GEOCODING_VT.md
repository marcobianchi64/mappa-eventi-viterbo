# Geocoding eventi — provincia di Viterbo

## Problema

Gli eventi in database hanno `lat`/`lng` **salvati al momento della pubblicazione**. Se il comune era sbagliato (es. default Viterbo) o il testo dice un altro comune, il pin resta fuori posto anche dopo fix al codice.

## Regole Atlas (collaudate con `npm run verify:geocoding`)

1. **Testo prima del campo comune** — titolo, luogo e venue hanno priorità su `comune`/`city` (es. Castel S. Elia non finisce a Viterbo).
2. **Elenco comuni VT** — coordinate centro abitato ISTAT/OSM in `viterbo-geocode.ts` (nessun servizio esterno in runtime).
3. **Frazioni** — Bagnaia, La Quercia, ecc. in `viterbo-frazioni.ts`, prima del centro del capoluogo.
4. **Pin in mappa** — `withMapAlignedCoordinates()` in `buildMapMarkerPlacements()`:
   - se il pin è il **fallback centro Viterbo**, oppure
   - è a più di **2,5 km** dal punto atteso da testo/comune,
   - la mappa usa le coordinate **ricalcolate** (senza `fix:coords` manuale).
5. **Nuove pubblicazioni** — Scoperta/import usano `geocodeEventPlace()` + `resolveEventComuneKey()`.

## Estensione ad altre province

Per una nuova provincia servono:

- tabella comuni + coordinate (come `COMUNE_COORDS`);
- eventuali frazioni/località critiche;
- alias ortografici (`COMUNE_ALIASES`);
- stessi test automatici con casi reali noti.

Non usiamo geocoder generico (Nominatim) in produzione senza revisione: troppi falsi positivi per eventi culturali.

## Comandi utili

| Comando | Uso |
|---------|-----|
| `npm run verify:geocoding` | Test automatici VT |
| `npm run fix:coords -- --dry-run` | Allineare **permanentemente** il DB (opzionale) |
