import type { AtlasEvent } from "./types/event.js";
import { manifestationDedupeKey, titleFingerprint } from "./event-duplicate.js";
import { getFestivalAppointmentLabel } from "./title-format.js";
import { normalizeSearchText } from "./utils.js";

/** Minimo appuntamenti per raggruppare in un pin festival (evita cerchi con pochi eventi distinti). */
export const MIN_FESTIVAL_MAP_GROUP_SIZE = 4;

export type FestivalMapGroup = {
  key: string;
  label: string;
  events: AtlasEvent[];
  /** Manifestazione madre (es. Fiera del Vino) che unisce più sotto-serie. */
  umbrella?: boolean;
};

function normalizeEventUrl(url: string | null | undefined): string {
  if (!url?.trim()) return "";
  try {
    const u = new URL(url.trim());
    u.hash = "";
    u.search = "";
    const path = u.pathname.replace(/\/+$/, "");
    return `${u.hostname.toLowerCase()}${path}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase().replace(/\/+$/, "");
  }
}

function comuneKey(event: Pick<AtlasEvent, "comune" | "city">): string {
  return normalizeSearchText(event.comune ?? event.city ?? "");
}

function coordBucket(lat: number, lng: number, decimals = 3): string {
  return `${Number(lat).toFixed(decimals)},${Number(lng).toFixed(decimals)}`;
}

function eventText(
  event: Pick<AtlasEvent, "title" | "description" | "venue" | "location">,
): string {
  return [event.title, event.description, event.venue, event.location].filter(Boolean).join(" ");
}

/**
 * Manifestazione «ombrello» (es. tutta la Fiera del Vino a Montefiascone),
 * indipendentemente dalle sotto-serie («In Cantina con Defuk», ecc.).
 */
export function inferFestivalUmbrellaKey(
  event: Pick<AtlasEvent, "title" | "description" | "venue" | "location" | "comune" | "city">,
): string | null {
  const place = comuneKey(event);
  if (!place) return null;

  const norm = normalizeSearchText(eventText(event));
  if (!norm) return null;

  if (norm.includes("fiera del vino")) return `umbrella|${place}|fiera`;

  if (
    norm.includes("fiera") &&
    (norm.includes("vino") ||
      norm.includes("cantin") ||
      norm.includes("degustaz") ||
      norm.includes("enogastronom"))
  ) {
    return `umbrella|${place}|fiera`;
  }

  return null;
}

/** Prefisso titolo prima di trattino/em dash (es. «Fiera del Vino — Serata jazz»). */
export function festivalTitleSeriesPrefix(title: string): string | null {
  const normalized = normalizeSearchText(title);
  const match = normalized.match(/^(.+?)\s*[—–-]\s+/);
  if (!match) return null;
  const prefix = match[1].trim();
  if (prefix.length < 10) return null;
  const fp = titleFingerprint(prefix);
  return fp.length >= 8 ? fp : null;
}

/**
 * Chiave serie festival per raggruppamento mappa.
 * Segnali: stessa pagina programma, stesso prefisso titolo, stessa manifestazione.
 */
export function festivalSeriesKey(
  event: Pick<AtlasEvent, "title" | "comune" | "city" | "venue" | "description" | "event_url">,
): string | null {
  const place = comuneKey(event);
  if (!place) return null;

  const url = normalizeEventUrl(event.event_url);
  if (url) return `url|${place}|${url}`;

  const prefix = festivalTitleSeriesPrefix(event.title);
  if (prefix) return `series|${place}|${prefix}`;

  const manifest = manifestationDedupeKey(event);
  if (manifest.length >= 12) return `manifest|${place}|${manifest}`;

  return null;
}

function pickFestivalLabel(events: AtlasEvent[]): string {
  for (const event of events) {
    const raw = event.title.trim();
    const match = raw.match(/^(.+?)\s*[—–-]\s+/);
    if (match && match[1].trim().length >= 8) return match[1].trim();
  }
  const shortest = events
    .map((e) => e.title.trim())
    .filter((t) => t.length >= 8)
    .sort((a, b) => a.length - b.length)[0];
  return shortest ?? events[0]?.title ?? "Manifestazione";
}

function pickFestivalUmbrellaLabel(events: AtlasEvent[]): string {
  const joined = events.map((e) => eventText(e)).join(" ");
  if (/fiera\s+del\s+vino/i.test(joined)) return "Fiera del Vino";
  if (/\bfiera\b/i.test(joined)) return "Fiera enogastronomica";
  return "Manifestazione";
}

function sortFestivalEvents(events: AtlasEvent[]): AtlasEvent[] {
  return [...events].sort((a, b) => {
    const ta = new Date(a.start_date).getTime();
    const tb = new Date(b.start_date).getTime();
    if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return ta - tb;
    return getFestivalAppointmentLabel(a).localeCompare(getFestivalAppointmentLabel(b), "it");
  });
}

/** Coordinate medie per un pin unico su manifestazioni diffuse sullo stesso comune. */
export function festivalGroupAnchorCoords(
  events: AtlasEvent[],
): { lat: number; lng: number } {
  const valid = events.filter(
    (e) => Number.isFinite(Number(e.lat)) && Number.isFinite(Number(e.lng)),
  );
  if (valid.length === 0) return { lat: 0, lng: 0 };
  const lat = valid.reduce((sum, e) => sum + Number(e.lat), 0) / valid.length;
  const lng = valid.reduce((sum, e) => sum + Number(e.lng), 0) / valid.length;
  return { lat, lng };
}

/**
 * Raggruppa eventi festival: prima manifestazioni ombrello (un pin per comune),
 * poi sotto-serie con stesse coordinate.
 */
export function findFestivalMapGroups(
  events: AtlasEvent[],
  minSize = MIN_FESTIVAL_MAP_GROUP_SIZE,
): FestivalMapGroup[] {
  const groups: FestivalMapGroup[] = [];
  const assigned = new Set<string>();

  const umbrellaBuckets = new Map<string, AtlasEvent[]>();
  for (const event of events) {
    const umbrellaKey = inferFestivalUmbrellaKey(event);
    if (!umbrellaKey) continue;
    const list = umbrellaBuckets.get(umbrellaKey) ?? [];
    list.push(event);
    umbrellaBuckets.set(umbrellaKey, list);
  }

  for (const [key, list] of umbrellaBuckets) {
    if (list.length < minSize) continue;
    const sorted = sortFestivalEvents(list);
    groups.push({
      key,
      label: pickFestivalUmbrellaLabel(sorted),
      events: sorted,
      umbrella: true,
    });
    for (const event of sorted) {
      if (event.date_event) assigned.add(String(event.date_event));
    }
  }

  const seriesBuckets = new Map<string, AtlasEvent[]>();
  for (const event of events) {
    const id = event.date_event ? String(event.date_event) : "";
    if (id && assigned.has(id)) continue;

    const seriesKey = festivalSeriesKey(event);
    if (!seriesKey) continue;
    const bucket = `${seriesKey}|${coordBucket(event.lat, event.lng)}`;
    const list = seriesBuckets.get(bucket) ?? [];
    list.push(event);
    seriesBuckets.set(bucket, list);
  }

  for (const [bucketKey, list] of seriesBuckets) {
    if (list.length < minSize) continue;
    const sorted = sortFestivalEvents(list);
    groups.push({
      key: bucketKey,
      label: pickFestivalLabel(sorted),
      events: sorted,
      umbrella: false,
    });
  }

  return groups;
}

/** Id evento → chiave gruppo festival (se incluso in un gruppo mappa). */
export function festivalGroupMembership(
  events: AtlasEvent[],
  minSize = MIN_FESTIVAL_MAP_GROUP_SIZE,
): Map<string, string> {
  const membership = new Map<string, string>();
  for (const group of findFestivalMapGroups(events, minSize)) {
    for (const event of group.events) {
      if (event.date_event) membership.set(String(event.date_event), group.key);
    }
  }
  return membership;
}

export function getFestivalGroupForEvent(
  groups: FestivalMapGroup[],
  event: AtlasEvent,
): FestivalMapGroup | null {
  const id = event.date_event ? String(event.date_event) : "";
  if (!id) return null;
  return groups.find((g) => g.events.some((e) => String(e.date_event) === id)) ?? null;
}
