import type { AtlasEvent } from "./types/event.js";
import { formatComuneLabel, inferComuneFromText } from "./viterbo-geocode.js";
import { getFrazioneEntry, inferLocalitaFromText } from "./viterbo-frazioni.js";

/** Luogo mostrato all'utente: venue, comune, frazione o località inferita dal testo. */
export function getEventVenueDisplay(
  event: Pick<AtlasEvent, "venue" | "comune" | "city" | "location" | "title">,
): string {
  const venue = event.venue?.trim();
  if (venue) return venue;

  const comune = event.comune?.trim() || event.city?.trim();
  if (comune) return comune;

  const location = event.location?.trim();
  if (location) return location;

  const localitaKey = inferLocalitaFromText(event.venue, event.location, event.title, event.comune, event.city);
  if (localitaKey) {
    return getFrazioneEntry(localitaKey)?.label ?? localitaKey;
  }

  const comuneKey = inferComuneFromText(event.comune, event.city, event.title, event.venue, event.location);
  if (comuneKey) return formatComuneLabel(comuneKey);

  return "";
}
