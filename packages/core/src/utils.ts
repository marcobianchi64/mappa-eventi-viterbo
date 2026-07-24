import type { AtlasEvent, DateRangeKey, DateRangeWindow } from "./types/event.js";
import { CATEGORY_META } from "./constants.js";
import { dedupeEventsForMap, eventsAreLikelyDuplicates } from "./event-duplicate.js";

export function getCategoryMeta(category: string) {
  return CATEGORY_META[category as keyof typeof CATEGORY_META] ?? {
    label: "Evento",
    color: "#667085",
    icon: "•",
  };
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return date.toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short" });
}

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

function nextSaturday(now: Date): Date {
  const d = startOfDay(now);
  const day = d.getDay();
  const diff = (6 - day + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

export function getRangeWindow(range: DateRangeKey): DateRangeWindow {
  const now = new Date();
  let from = now;
  let to = new Date(now);

  if (range === "today") {
    from = startOfDay(now);
    to = endOfDay(now);
  } else if (range === "tomorrow") {
    from = startOfDay(now);
    from.setDate(from.getDate() + 1);
    to = endOfDay(from);
  } else if (range === "weekend") {
    from = nextSaturday(now);
    to = endOfDay(from);
    to.setDate(to.getDate() + 1);
  } else {
    const days = Number(range) || 15;
    from = startOfDay(now);
    to = startOfDay(now);
    to.setDate(to.getDate() + days);
    to.setHours(23, 59, 59, 999);
  }

  return { from, to };
}

/** Stato ciclo di vita evento (allineato al Registro admin). */
export function getEventLifecycle(
  event: AtlasEvent,
): "live" | "past" | "pending" | "rejected" | "archived" {
  if (event.archived) return "archived";
  if (event.review_status === "pending") return "pending";
  if (event.review_status === "rejected") return "rejected";

  const today = startOfDay(new Date());
  const end = event.end_date ? new Date(event.end_date) : new Date(event.start_date);
  if (!Number.isNaN(end.getTime()) && end < today) return "past";
  return "live";
}

/** Filtro Registro: visibilità «In pubblicazione». */
export function isRegistryInPubblicazione(event: AtlasEvent): boolean {
  return getEventLifecycle(event) === "live" && event.verified === true;
}

export function hasValidEventCoords(event: AtlasEvent): boolean {
  return Number.isFinite(Number(event.lat)) && Number.isFinite(Number(event.lng));
}

export interface MapMarkerPlacement {
  event: AtlasEvent;
  lat: number;
  lng: number;
}

/** Separa pin sovrapposti (stesse coordinate) in cerchio attorno al punto reale. */
export function buildMapMarkerPlacements(events: AtlasEvent[]): MapMarkerPlacement[] {
  const unique = dedupeEventsForMap(events);
  const valid = unique.filter(hasValidEventCoords);
  const buckets = new Map<string, AtlasEvent[]>();

  for (const event of valid) {
    const key = `${Number(event.lat).toFixed(4)},${Number(event.lng).toFixed(4)}`;
    const group = buckets.get(key) ?? [];
    group.push(event);
    buckets.set(key, group);
  }

  const placements: MapMarkerPlacement[] = [];
  const offsetDeg = 0.004;

  for (const group of buckets.values()) {
    if (group.length === 1) {
      placements.push({ event: group[0], lat: group[0].lat, lng: group[0].lng });
      continue;
    }
    const baseLat = group[0].lat;
    const baseLng = group[0].lng;
    group.forEach((event, index) => {
      const angle = (2 * Math.PI * index) / group.length;
      placements.push({
        event,
        lat: baseLat + Math.sin(angle) * offsetDeg,
        lng: baseLng + Math.cos(angle) * offsetDeg,
      });
    });
  }

  return placements;
}

export function isEventVisibleInRange(event: AtlasEvent, range: DateRangeKey): boolean {
  if (event.verified !== true) return false;
  if (event.archived === true) return false;

  const start = event.start_date ? new Date(event.start_date) : null;
  const end = event.end_date ? new Date(event.end_date) : start;
  if (!start || Number.isNaN(start.getTime())) return false;
  if (end && end < new Date()) return false;

  const { from, to } = getRangeWindow(range);
  return start <= to && (end || start) >= from;
}

export function normalizeSearchText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function searchableEventText(event: AtlasEvent): string {
  const meta = getCategoryMeta(event.category);
  return normalizeSearchText(
    [
      event.title,
      event.venue,
      event.description,
      event.province,
      event.city,
      event.comune,
      event.location,
      meta.label,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`;
}

export function createEventShareUrl(event: AtlasEvent, baseUrl: string): string {
  const id = encodeURIComponent(event.date_event ?? "");
  const origin = baseUrl.replace(/\/?$/, "/");
  return `${origin}event.html?id=${id}`;
}

export function reminderText(startDate: string | null | undefined): string {
  if (!startDate) return "Ti ricorderemo questo evento.";
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return "Ti ricorderemo questo evento.";
  const reminder = new Date(start);
  reminder.setDate(reminder.getDate() - 1);
  return `Promemoria consigliato: ${reminder.toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short" })}`;
}

/** Confronto base per deduplicazione segnalazioni vs eventi esistenti */
export function eventsLookSimilar(
  a: {
    title: string;
    start_date: string;
    end_date?: string | null;
    venue?: string | null;
    comune?: string | null;
    city?: string | null;
    lat: number;
    lng: number;
    event_url?: string | null;
  },
  b: {
    title: string;
    start_date: string;
    end_date?: string | null;
    venue?: string | null;
    comune?: string | null;
    city?: string | null;
    lat: number;
    lng: number;
    event_url?: string | null;
  },
): boolean {
  return eventsAreLikelyDuplicates(a, b);
}

/** Titolo breve per pin/tooltip mappa — nessun intervento manuale */
export function formatDisplayTitle(title: string, maxLength = 48): string {
  const cleaned = String(title ?? "").replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  const slice = cleaned.slice(0, maxLength - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > maxLength * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${cut}…`;
}

/** Codice tracciabilità segnalazione utente */
export function generateSubmissionReference(): string {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ATL-${ymd}-${rand}`;
}

export function buildSubmissionWhatsAppUrl(
  opsPhoneDigits: string,
  payload: { reference: string; title: string; startDate: string; venue?: string | null },
): string {
  const text = [
    "Conferma richiesta inserimento evento — Project Atlas",
    `Rif: ${payload.reference}`,
    `Titolo: ${payload.title}`,
    `Data: ${payload.startDate}`,
    payload.venue ? `Luogo: ${payload.venue}` : "",
    "",
    "Invia questo messaggio per registrare la tua segnalazione.",
  ]
    .filter(Boolean)
    .join("\n");

  return `https://wa.me/${opsPhoneDigits}?text=${encodeURIComponent(text)}`;
}

export function detectContactType(contact: string): "email" | "whatsapp" | "phone" | "other" {
  const value = contact.trim().toLowerCase();
  if (value.includes("@")) return "email";
  if (value.includes("wa.me") || value.includes("whatsapp")) return "whatsapp";
  if (/^\+?[\d\s\-().]{8,}$/.test(value)) return "phone";
  return "other";
}
