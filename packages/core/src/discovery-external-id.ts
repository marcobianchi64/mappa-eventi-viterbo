import { normalizeSearchText } from "./utils.js";
import { normalizeDiscoveryDateString } from "./discovery-normalize.js";

/** Id stabile per Scoperta: stesso titolo+giorno+comune = stesso evento (anche con URL festival condiviso). */
export function discoveryEventExternalId(
  title: string,
  startDateIso: string,
  comune: string,
): string {
  const day = normalizeDiscoveryDateString(startDateIso) ?? startDateIso.slice(0, 10);
  const raw = `${normalizeSearchText(title)}|${day}|${normalizeSearchText(comune)}`;
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `disc-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
