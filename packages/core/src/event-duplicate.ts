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

export function titlesLookSimilar(a: string, b: string): boolean {
  const titleA = normalizeSearchText(a);
  const titleB = normalizeSearchText(b);
  if (!titleA || !titleB) return false;
  if (titleA === titleB) return true;
  if (titleA.includes(titleB) || titleB.includes(titleA)) return true;

  const minLen = Math.min(titleA.length, titleB.length);
  if (minLen < 16) return false;
  const coreLen = Math.min(48, minLen);
  const coreA = titleA.slice(0, coreLen);
  const coreB = titleB.slice(0, coreLen);
  return coreA === coreB || coreA.includes(coreB) || coreB.includes(coreA);
}

function sameComune(
  a: Pick<DuplicateComparableEvent, "comune" | "city">,
  b: Pick<DuplicateComparableEvent, "comune" | "city">,
): boolean {
  const comuneA = normalizeSearchText(a.comune ?? a.city ?? "");
  const comuneB = normalizeSearchText(b.comune ?? b.city ?? "");
  return Boolean(comuneA && comuneB && comuneA === comuneB);
}

/** Confronto per deduplicazione: titolo simile + date sovrapposte + stesso luogo/comune. */
export function eventsAreLikelyDuplicates(
  a: DuplicateComparableEvent,
  b: DuplicateComparableEvent,
): boolean {
  if (a.event_url && b.event_url && a.event_url === b.event_url) return true;
  if (!titlesLookSimilar(a.title, b.title)) return false;

  const sameDay =
    startOfDay(new Date(a.start_date)).getTime() === startOfDay(new Date(b.start_date)).getTime();
  if (!sameDay && !eventDatesOverlap(a, b)) return false;

  const venueMatch =
    normalizeSearchText(a.venue) && normalizeSearchText(b.venue)
      ? normalizeSearchText(a.venue) === normalizeSearchText(b.venue)
      : false;

  const distanceKm = haversineKm(a.lat, a.lng, b.lat, b.lng);
  const near = distanceKm < 2;

  return venueMatch || near || sameComune(a, b);
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
