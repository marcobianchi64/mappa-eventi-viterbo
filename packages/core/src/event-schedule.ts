import type { AtlasEvent } from "./types/event.js";
import {
  formatEventDateTime,
  formatEventTimeOnly,
} from "./event-datetime-display.js";

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
    return formatEventDateTime(event.start_date);
  }

  const ongoing = isEventOngoing(event, now);

  if (sameCalendarDay(start, end)) {
    const startTime = formatEventTimeOnly(event.start_date);
    const endTime = formatEventTimeOnly(event.end_date!);
    if (!startTime && !endTime) {
      return start.toLocaleDateString("it-IT", { dateStyle: "medium" });
    }
    if (ongoing && endTime) {
      return `In corso · fino alle ${endTime}`;
    }
    const day = start.toLocaleDateString("it-IT", { dateStyle: "medium" });
    if (startTime && endTime) return `${day}, ${startTime} – ${endTime}`;
    if (startTime) return `${day}, ${startTime}`;
    return day;
  }

  if (ongoing) {
    return `In corso · fino al ${formatEventDateTime(event.end_date!)}`;
  }

  const startLabel = formatEventDateTime(event.start_date);
  const endLabel = formatEventDateTime(event.end_date!);
  if (startLabel === endLabel) return startLabel;

  return `Dal ${startLabel} al ${endLabel}`;
}

/** Data/ora compatta per elenco festival in tooltip (solo giorno di inizio). */
export function formatFestivalListDate(value: string | null | undefined): string {
  const start = parseEventDate(value);
  if (!start) return "";

  const day = start.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  const time = formatEventTimeOnly(value);
  return time ? `${day}, ${time}` : day;
}

/** True se l'appuntamento festival è in un giorno già trascorso (anteprima hover). */
export function isFestivalAppointmentPast(
  event: ScheduleInput,
  now: Date = new Date(),
): boolean {
  const start = parseEventDate(event.start_date);
  if (!start) return false;
  const today = startOfDay(now);
  const day = startOfDay(start);
  return day.getTime() < today.getTime();
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
