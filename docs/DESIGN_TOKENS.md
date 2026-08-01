# Token UI Atlas — contratto v2

**Non perdere tempo su dimensioni a caso.** Tutte le misure UI della mappa sono centralizzate e verificate in CI.

## Unica fonte di verità

| File | Ruolo |
|------|--------|
| `packages/core/src/map-ui-scale.ts` | Numeri desktop/mobile (pin, testo, tooltip, pannello, scheda evento) |
| `packages/core/src/map-marker.ts` | Factory pin Leaflet condivisa web + admin |
| `packages/core/styles/atlas-map-ui.css` | CSS pin e tooltip |

## Valori attuali (bloccati — contratto v2)

| Token | Desktop | Mobile |
|-------|---------|--------|
| Pin | 68px | 80px |
| Testo base / form | **20px** | **20px** |
| Tooltip titolo | **26px** | **27px** |
| Tooltip corpo | **20px** | **21px** |
| Scheda evento titolo | **28px** | **28px** |
| Dock (solo desktop) | 248px, 2 pulsanti | — |
| Pannello espanso (flyout) | 500px | bottom sheet |

Minimi accessibilità: touch **48px**, testo **16px**.

## UX desktop — dock

Pannello sinistro compatto con due pulsanti:

1. **Eventi vicino a te** → flyout con ricerca, geolocalizzazione, legenda
2. **Inserisci un evento** → flyout con modulo segnalazione

## Come modificare (solo se necessario)

1. Modifica **solo** `map-ui-scale.ts`
2. Incrementa `ATLAS_UI_SCALE_CONTRACT_VERSION`
3. Esegui `npm run verify:ui-scale`
4. Aggiorna questa tabella

## Vietato

- Pin o font hardcoded in `map-service.ts` / `admin-map.ts`
- `font-size: 10px` / `12px` su schede evento o tooltip
- Ripristinare il pannello sinistro monolitico a schermo intero

## Verifica automatica

```bash
npm run verify:ui-scale
```

Eseguito in CI su ogni push/PR.
