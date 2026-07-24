import type { CollectedEvent } from "./types.js";
import { isPastEvent } from "./normalize.js";

export interface QualityResult {
  ok: boolean;
  reasons: string[];
}

export function validateCollectedEvent(event: CollectedEvent): QualityResult {
  const reasons: string[] = [];

  if (!event.title?.trim()) reasons.push("titolo mancante");
  if (!event.start_date) reasons.push("data inizio mancante");
  if (!event.event_url) reasons.push("link mancante");
  if (!event.external_id) reasons.push("external_id mancante");
  if (isPastEvent(event.end_date, event.start_date)) reasons.push("evento passato");

  return { ok: reasons.length === 0, reasons };
}

export function shouldAutoPublish(reliability: "A" | "B" | "C", quality: QualityResult, hasCoords: boolean): boolean {
  if (!quality.ok) return false;
  if (!hasCoords) return false;
  return reliability === "A" || reliability === "B";
}
