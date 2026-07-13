import type { AtlasEvent, DateRangeKey, DateRangeWindow } from "./types/event.js";
import { CATEGORY_META } from "./constants.js";

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
    from = now;
    to.setDate(to.getDate() + days);
  }

  return { from, to };
}

export function isEventVisibleInRange(event: AtlasEvent, range: DateRangeKey): boolean {
  if (event.verified !== true) return false;

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
  return `${baseUrl}?event=${id}`;
}

export function reminderText(startDate: string | null | undefined): string {
  if (!startDate) return "Ti ricorderemo questo evento.";
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return "Ti ricorderemo questo evento.";
  const reminder = new Date(start);
  reminder.setDate(reminder.getDate() - 1);
  return `Promemoria consigliato: ${reminder.toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short" })}`;
}
