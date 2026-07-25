import type { AtlasEvent } from "./types/event.js";
import { formatDate } from "./utils.js";

type ScheduleInput = Pick<AtlasEvent, "start_date" | "end_date">;

function parseEventDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfCalendarDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return startOfCalendarDay(a).getTime() === startOfCalendarDay(b).getTime();
}

function formatTimeIt(date: Date): string {
  return date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

/** True se l'evento è iniziato e la fine (o l'istante di inizio, se senza fine) non è ancora passata. */
export function isEventOngoing(event: ScheduleInput, now: Date = new Date()): boolean {
  const start = parseEventDate(event.start_date);
  if (!start) return false;
  const end = parseEventDate(event.end_date) ?? start;
  const t = now.getTime();
  return start.getTime() <= t && t <= end.getTime();
}

/**
 * Testo unico per l'utente: intervallo date/orari e, se applicabile, «In corso · fino al …».
 */
export function formatEventSchedule(event: ScheduleInput, now: Date = new Date()): string {
  const start = parseEventDate(event.start_date);
  if (!start) return "";

  const end = parseEventDate(event.end_date);
  if (!end || end.getTime() <= start.getTime()) {
    return formatDate(event.start_date);
  }

  const ongoing = isEventOngoing(event, now);

  if (sameCalendarDay(start, end)) {
    if (ongoing) {
      return `In corso · fino alle ${formatTimeIt(end)}`;
    }
    const day = start.toLocaleDateString("it-IT", { dateStyle: "medium" });
    return `${day}, ${formatTimeIt(start)} – ${formatTimeIt(end)}`;
  }

  if (ongoing) {
    return `In corso · fino al ${formatDate(event.end_date!)}`;
  }

  return `Dal ${formatDate(event.start_date)} al ${formatDate(event.end_date!)}`;
}
