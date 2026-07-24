import type { AtlasEvent } from "./types/event.js";
import { normalizeSearchText } from "./utils.js";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export interface DuplicateComparableEvent {
  title: string;
  start_date: string;
  end_date?: string | null;
  venue?: string | null;
  comune?: string | null;
  city?: string | null;
  lat: number;
  lng: number;
  event_url?: string | null;
}

function eventDateRange(event: DuplicateComparableEvent): { start: Date; end: Date } {
  const start = new Date(event.start_date);
  const end = event.end_date ? new Date(event.end_date) : start;
  return { start: startOfDay(start), end: endOfDay(end) };
}

export function eventDatesOverlap(
  a: Pick<DuplicateComparableEvent, "start_date" | "end_date">,
  b: Pick<DuplicateComparableEvent, "start_date" | "end_date">,
): boolean {
  const ra = eventDateRange(a as DuplicateComparableEvent);
  const rb = eventDateRange(b as DuplicateComparableEvent);
  if (Number.isNaN(ra.start.getTime()) || Number.isNaN(rb.start.getTime())) return false;
  return ra.start <= rb.end && rb.start <= ra.end;
}

/** Impronta titolo per confronto (senza date/edizione). */
export function titleFingerprint(title: string): string {
  return normalizeSearchText(title)
    .replace(/\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/g, " ")
    .replace(/\b\d{1,2}\s+(gen|feb|mar|apr|mag|giu|lug|ago|set|ott|nov|dic)[a-z]*\b/g, " ")
    .replace(/\b(xxx+|xxix|xxviii|xxvii|xxvi|xxv|xxiv|xxiii|xxii|xxi|xx|edizione)\b/g, " ")
    .replace(/\b(dal|al|il|la|lo|del|della|dei|degli|delle|e|di|in|a)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 64);
}

export function titlesLookSimilar(a: string, b: string): boolean {
  const titleA = normalizeSearchText(a);
  const titleB = normalizeSearchText(b);
  if (!titleA || !titleB) return false;
  if (titleA === titleB) return true;
  if (titleA.includes(titleB) || titleB.includes(titleA)) return true;

  const fpA = titleFingerprint(a);
  const fpB = titleFingerprint(b);
  if (fpA && fpB && (fpA === fpB || fpA.includes(fpB) || fpB.includes(fpA))) return true;

  const minLen = Math.min(titleA.length, titleB.length);
  if (minLen < 12) return false;
  const coreLen = Math.min(40, minLen);
  const coreA = titleA.slice(0, coreLen);
  const coreB = titleB.slice(0, coreLen);
  return coreA === coreB || coreA.includes(coreB) || coreB.includes(coreA);
}

function coordBucket(lat: number, lng: number, decimals = 3): string {
  return `${Number(lat).toFixed(decimals)},${Number(lng).toFixed(decimals)}`;
}

function sameComune(
  a: Pick<DuplicateComparableEvent, "comune" | "city">,
  b: Pick<DuplicateComparableEvent, "comune" | "city">,
): boolean {
  const comuneA = normalizeSearchText(a.comune ?? a.city ?? "");
  const comuneB = normalizeSearchText(b.comune ?? b.city ?? "");
  return Boolean(comuneA && comuneB && comuneA === comuneB);
}

function samePinArea(a: DuplicateComparableEvent, b: DuplicateComparableEvent): boolean {
  if (!Number.isFinite(a.lat) || !Number.isFinite(b.lat)) return false;
  if (coordBucket(a.lat, a.lng) === coordBucket(b.lat, b.lng)) return true;
  return haversineKm(a.lat, a.lng, b.lat, b.lng) < 2;
}

function sameTitleFingerprint(a: string, b: string): boolean {
  const fpA = titleFingerprint(a);
  const fpB = titleFingerprint(b);
  if (!fpA || !fpB || fpA.length < 8) return false;
  return fpA === fpB || fpA.includes(fpB) || fpB.includes(fpA);
}

function datesCloseEnough(a: DuplicateComparableEvent, b: DuplicateComparableEvent, maxDays = 30): boolean {
  const sameDay =
    startOfDay(new Date(a.start_date)).getTime() === startOfDay(new Date(b.start_date)).getTime();
  if (sameDay || eventDatesOverlap(a, b)) return true;

  const startA = startOfDay(new Date(a.start_date)).getTime();
  const startB = startOfDay(new Date(b.start_date)).getTime();
  if (Number.isNaN(startA) || Number.isNaN(startB)) return false;
  const daysApart = Math.abs(startA - startB) / (24 * 60 * 60 * 1000);
  return daysApart <= maxDays;
}

function normalizeEventUrl(url: string | null | undefined): string {
  if (!url?.trim()) return "";
  try {
    const u = new URL(url.trim());
    u.hash = "";
    u.search = "";
    let path = u.pathname.replace(/\/+$/, "");
    return `${u.hostname.toLowerCase()}${path}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase().replace(/\/+$/, "");
  }
}

function sameEventUrl(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeEventUrl(a);
  const nb = normalizeEventUrl(b);
  return Boolean(na && nb && na === nb);
}

function sameStartDay(a: DuplicateComparableEvent, b: DuplicateComparableEvent): boolean {
  return (
    startOfDay(new Date(a.start_date)).getTime() === startOfDay(new Date(b.start_date)).getTime()
  );
}

/**
 * Scoperta manuale: una sola URL (pagina festival/programma) copre molti concerti.
 * Duplicato solo se stesso link + stesso giorno + titolo simile.
 */
export function eventsAreDiscoveryDuplicates(
  a: DuplicateComparableEvent,
  b: DuplicateComparableEvent,
): boolean {
  if (sameEventUrl(a.event_url, b.event_url)) {
    return sameStartDay(a, b) && titlesLookSimilar(a.title, b.title);
  }
  return eventsAreSameCalendarEvent(a, b);
}

/** Stesso evento in Scoperta / import: stesso giorno, stesso luogo, stesso titolo (non «simile»). */
export function eventsAreSameCalendarEvent(
  a: DuplicateComparableEvent,
  b: DuplicateComparableEvent,
): boolean {
  if (!sameStartDay(a, b)) return false;
  if (!samePinArea(a, b) && !sameComune(a, b)) return false;

  const titleA = normalizeSearchText(a.title);
  const titleB = normalizeSearchText(b.title);
  if (titleA && titleA === titleB) return true;

  return sameTitleFingerprint(a.title, b.title);
}

/** Confronto per deduplicazione DB: titolo simile + stesso luogo + date vicine/sovrapposte. */
export function eventsAreLikelyDuplicates(
  a: DuplicateComparableEvent,
  b: DuplicateComparableEvent,
): boolean {
  if (sameEventUrl(a.event_url, b.event_url)) {
    return sameStartDay(a, b) && titlesLookSimilar(a.title, b.title);
  }
  if (!titlesLookSimilar(a.title, b.title)) return false;
  if (!datesCloseEnough(a, b)) return false;
  return samePinArea(a, b) || sameComune(a, b);
}

/**
 * Duplicato sulla mappa: solo copie reali dello stesso evento.
 * Eventi distinti nello stesso comune (stesse coordinate) restano tutti visibili
 * (offset circolare in buildMapMarkerPlacements).
 */
export function eventsAreMapDuplicates(
  a: DuplicateComparableEvent,
  b: DuplicateComparableEvent,
): boolean {
  const idA = (a as { date_event?: string }).date_event;
  const idB = (b as { date_event?: string }).date_event;
  if (idA && idB && idA === idB) return true;

  if (sameEventUrl(a.event_url, b.event_url)) {
    return sameStartDay(a, b) && titlesLookSimilar(a.title, b.title);
  }

  if (!sameStartDay(a, b)) return false;
  if (!samePinArea(a, b) && !sameComune(a, b)) return false;

  const titleA = normalizeSearchText(a.title);
  const titleB = normalizeSearchText(b.title);
  if (titleA && titleA === titleB) return true;

  return sameTitleFingerprint(a.title, b.title);
}

/** Eventi esclusi da dedupeEventsForMap (per diagnostica Registro ↔ Mappa). */
export function eventsSuppressedByMapDedupe(events: AtlasEvent[]): AtlasEvent[] {
  const kept: AtlasEvent[] = [];
  const suppressed: AtlasEvent[] = [];

  for (const event of events) {
    const existingIndex = kept.findIndex((candidate) => eventsAreMapDuplicates(event, candidate));
    if (existingIndex === -1) {
      kept.push(event);
      continue;
    }

    const current = kept[existingIndex];
    const score = mapDedupeRichnessScore;
    if (score(event) > score(current)) {
      suppressed.push(current);
      kept[existingIndex] = event;
    } else {
      suppressed.push(event);
    }
  }

  return suppressed;
}

function mapDedupeRichnessScore(e: AtlasEvent): number {
  return (
    (e.end_date ? 2 : 0) +
    (e.event_url ? 2 : 0) +
    (e.venue ? 1 : 0) +
    (e.description ? 1 : 0) +
    (e.comune || e.city ? 1 : 0)
  );
}

/** Rimuove duplicati visivi prima di disegnare i pin (tiene il record più completo). */
export function dedupeEventsForMap(events: AtlasEvent[]): AtlasEvent[] {
  const kept: AtlasEvent[] = [];

  for (const event of events) {
    const existingIndex = kept.findIndex((candidate) => eventsAreMapDuplicates(event, candidate));
    if (existingIndex === -1) {
      kept.push(event);
      continue;
    }

    const current = kept[existingIndex];

    if (mapDedupeRichnessScore(event) > mapDedupeRichnessScore(current)) {
      kept[existingIndex] = event;
    }
  }

  return kept;
}

export function findDuplicateClusters(events: AtlasEvent[]): AtlasEvent[][] {
  const clusters: AtlasEvent[][] = [];
  const assigned = new Set<string>();

  for (const event of events) {
    const id = event.date_event;
    if (!id || assigned.has(id)) continue;

    const cluster = [event];
    assigned.add(id);

    for (const other of events) {
      const otherId = other.date_event;
      if (!otherId || assigned.has(otherId)) continue;
      if (eventsAreLikelyDuplicates(event, other)) {
        cluster.push(other);
        assigned.add(otherId);
      }
    }

    if (cluster.length > 1) clusters.push(cluster);
  }

  return clusters;
}

/** Raggruppa eventi sullo stesso pin (per diagnostica). */
export function findMapPinClusters(events: AtlasEvent[]): AtlasEvent[][] {
  const clusters: AtlasEvent[][] = [];
  const assigned = new Set<string>();

  for (const event of events) {
    const id = event.date_event;
    if (!id || assigned.has(id)) continue;

    const cluster = [event];
    assigned.add(id);

    for (const other of events) {
      const otherId = other.date_event;
      if (!otherId || assigned.has(otherId)) continue;
      if (eventsAreMapDuplicates(event, other)) {
        cluster.push(other);
        assigned.add(otherId);
      }
    }

    if (cluster.length > 1) clusters.push(cluster);
  }

  return clusters;
}

/** Raggruppa per coordinate (3 decimali) + impronta titolo — cattura copie identiche sullo stesso pin. */
export function findCoordTitleClusters(events: AtlasEvent[]): AtlasEvent[][] {
  const groups = new Map<string, AtlasEvent[]>();

  for (const event of events) {
    if (!event.date_event || !Number.isFinite(event.lat)) continue;
    const fp = titleFingerprint(event.title);
    if (fp.length < 8) continue;
    const key = `${coordBucket(event.lat, event.lng)}|${fp}`;
    const list = groups.get(key) ?? [];
    list.push(event);
    groups.set(key, list);
  }

  return [...groups.values()].filter((group) => group.length > 1);
}

/** Unisce cluster che condividono almeno un evento. */
export function mergeEventClusters(clusters: AtlasEvent[][]): AtlasEvent[][] {
  const merged: AtlasEvent[][] = [];

  for (const cluster of clusters) {
    const ids = new Set(cluster.map((e) => e.date_event).filter(Boolean) as string[]);
    const existing = merged.findIndex((m) =>
      m.some((e) => e.date_event && ids.has(e.date_event)),
    );

    if (existing === -1) {
      merged.push([...cluster]);
      continue;
    }

    const combined = new Map<string, AtlasEvent>();
    for (const event of [...merged[existing], ...cluster]) {
      if (event.date_event) combined.set(event.date_event, event);
    }
    merged[existing] = [...combined.values()];
  }

  return merged.filter((group) => group.length > 1);
}

export function findAllDuplicateClusters(events: AtlasEvent[]): AtlasEvent[][] {
  return mergeEventClusters([
    ...findDuplicateClusters(events),
    ...findMapPinClusters(events),
    ...findCoordTitleClusters(events),
  ]);
}
