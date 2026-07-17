import type { CollectedEvent } from "../types.js";
import {
  cleanTitle,
  extractCityFromTitle,
  extractVenueFromTitle,
  inferCategory,
  parseItalianDateRange,
  stripHtml,
} from "../normalize.js";
import { fetchHtml } from "./fetch-html.js";

export async function collectComuneViterboHtml(pageUrl: string): Promise<CollectedEvent[]> {
  const html = await fetchHtml(pageUrl);
  return parseComuneViterboListing(html);
}

export function parseComuneViterboListing(html: string): CollectedEvent[] {
  const events: CollectedEvent[] = [];

  const h3Regex = /<h3[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h3>/gi;
  let h3: RegExpExecArray | null;

  while ((h3 = h3Regex.exec(html)) !== null) {
    const url = h3[1].trim();
    const rawTitle = stripHtml(h3[2]);
    if (!url.includes("/eventi/")) continue;

    const { start, end } = parseItalianDateRange(rawTitle);
    if (!start) continue;

    const city = extractCityFromTitle(rawTitle) ?? "Viterbo";
    const venue = extractVenueFromTitle(rawTitle) ?? city;

    events.push({
      external_id: url,
      title: cleanTitle(rawTitle),
      start_date: start.toISOString(),
      end_date: end?.toISOString() ?? null,
      venue,
      city,
      category: inferCategory(rawTitle),
      event_url: url,
    });
  }

  const map = new Map<string, CollectedEvent>();
  for (const e of events) map.set(e.external_id, e);
  return [...map.values()];
}

