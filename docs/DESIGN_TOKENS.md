# Token UI Atlas — contratto v1

**Non perdere tempo su dimensioni a caso.** Tutte le misure UI della mappa sono centralizzate e verificate in CI.

## Unica fonte di verità

| File | Ruolo |
|------|--------|
| `packages/core/src/map-ui-scale.ts` | Numeri desktop/mobile (pin, testo, tooltip, pannello) |
| `packages/core/src/map-marker.ts` | Factory pin Leaflet condivisa web + admin |
| `packages/core/styles/atlas-map-ui.css` | CSS pin e tooltip (importato da entrambe le app) |

## Valori attuali (bloccati)

| Token | Desktop | Mobile |
|-------|---------|--------|
| Pin | 68px | 80px |
| Icona pin | 30px | 36px |
| Testo base | 18px | 18px |
| Tooltip titolo | 23px | 24px |
| Tooltip corpo | 18px | 19px |

Minimi accessibilità (non scendere sotto): touch **48px**, testo **16px**.

## Come modificare (solo se necessario)

1. Modifica **solo** `map-ui-scale.ts`
2. Incrementa `ATLAS_UI_SCALE_CONTRACT_VERSION` se cambiano i valori pubblicati
3. Esegui `npm run verify:ui-scale`
4. Aggiorna questa tabella

## Vietato

- `iconSize: [28, 28]` o simili in `map-service.ts` / `admin-map.ts`
- `font-size: 12px` su tooltip mappa (Leaflet default)
- Duplicare CSS pin fuori da `atlas-map-ui.css`

## Obbligatorio nel codice

```ts
import { applyMapUiScale, createAtlasMapMarkerIcon, ATLAS_MAP_TOOLTIP_CLASS } from "@atlas/core";

applyMapUiScale(); // all'avvio + al resize

L.divIcon({ className: "", ...createAtlasMapMarkerIcon(category) });
marker.bindTooltip(html, { className: ATLAS_MAP_TOOLTIP_CLASS });
```

## Verifica automatica

```bash
npm run verify:ui-scale
```

Eseguito in CI su ogni push/PR. Fallisce se qualcuno reintroduce dimensioni hardcoded o scende sotto i minimi.
