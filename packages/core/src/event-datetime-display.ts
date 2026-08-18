/** Orario mostrabile per eventi (evita 02:00 da date «solo giorno» in UTC). */

function parseEventInstant(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * True se l'orario nel DB non è informativo (solo data, mezzanotte UTC, offset Italia).
 */
export function isPlaceholderEventTime(iso: string | null | undefined, date: Date): boolean {
  const raw = String(iso ?? "").trim();
  if (!raw) return true;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return true;

  if (/^\d{4}-\d{2}-\d{2}T00:00:00(\.0+)?Z?$/i.test(raw)) return true;

  // Mezzanotte in Italia spesso serializzata come 22:00 o 23:00 UTC
  if (/^\d{4}-\d{2}-\d{2}T(22|23):00:00(\.0+)?Z$/i.test(raw)) return true;

  const h = date.getHours();
  const m = date.getMinutes();
  const s = date.getSeconds();
  if (m === 0 && s === 0 && (h === 0 || h === 1 || h === 2)) {
    if (!/T\d{1,2}:\d{2}/.test(raw) || /T00:00/.test(raw)) return true;
  }

  return false;
}

export function formatEventDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const date = parseEventInstant(value);
  if (!date) return String(value);

  if (isPlaceholderEventTime(value, date)) {
    return date.toLocaleDateString("it-IT", { dateStyle: "medium" });
  }

  return date.toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short" });
}

export function formatEventTimeOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = parseEventInstant(value);
  if (!date || isPlaceholderEventTime(value, date)) return null;
  return date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}
