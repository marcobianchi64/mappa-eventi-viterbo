import type { AtlasEvent } from "./types/event.js";
import {
  formatComuneLabel,
  normalizeComuneName,
  resolveEventComuneKey,
} from "./viterbo-geocode.js";
import { getFrazioneEntry, inferLocalitaFromText } from "./viterbo-frazioni.js";

/** Comune / frazione / località amministrativa da mostrare all'utente. */
export function getEventComuneDisplayLabel(
  event: Pick<AtlasEvent, "venue" | "comune" | "city" | "location" | "title">,
): string {
  const comuneKey = resolveEventComuneKey(event);
  if (comuneKey) return formatComuneLabel(comuneKey);

  const localitaKey = inferLocalitaFromText(
    event.venue,
    event.location,
    event.title,
    event.comune,
    event.city,
  );
  if (localitaKey) {
    return getFrazioneEntry(localitaKey)?.label ?? localitaKey;
  }

  return event.comune?.trim() || event.city?.trim() || event.location?.trim() || "";
}

function placeAlreadyInVenue(venue: string, place: string): boolean {
  const v = normalizeComuneName(venue);
  const p = normalizeComuneName(place);
  return v.includes(p) || p.includes(v);
}

/**
 * Luogo completo per tooltip e scheda: «Vitorchiano · Centro storico, Piazza Roma».
 */
export function getEventVenueDisplay(
  event: Pick<AtlasEvent, "venue" | "comune" | "city" | "location" | "title">,
): string {
  const venue = event.venue?.trim();
  const place = getEventComuneDisplayLabel(event);

  if (venue && place && !placeAlreadyInVenue(venue, place)) {
    return `${place} · ${venue}`;
  }
  if (venue) return venue;
  return place;
}
