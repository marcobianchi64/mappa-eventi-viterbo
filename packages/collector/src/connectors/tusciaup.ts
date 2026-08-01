import type { CollectedEvent } from "../types.js";
import {
  cleanTitle,
  decodeHtmlEntities,
  extractCityFromTitle,
  inferCategory,
  parseEventDateHints,
  stripHtml,
} from "../normalize.js";
import { fetchHtml } from "./fetch-html.js";

const BASE_URL = "https://www.tusciaup.it";

export async function collectTusciaUpHtml(pageUrl: string): Promise<CollectedEvent[]> {
  const html = await fetchHtml(pageUrl);
  return parseTusciaUpListing(html);
}

/** Parser generico per articoli evento su tusciaup.it (listing HTML). */
export function parseTusciaUpListing(html: string): CollectedEvent[] {
  const events: CollectedEvent[] = [];
  const linkRegex =
    /<a[^>]+href="(https?:\/\/(?:www\.)?tusciaup\.it\/[^"#?]+|\/[^"#?]+)"[^>]*>([\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(html)) !== null) {
    const rawHref = match[1].trim();
    const rawTitle = decodeHtmlEntities(stripHtml(match[2]));
    if (!rawTitle || rawTitle.length < 8) continue;

    const path = rawHref.replace(/^https?:\/\/(?:www\.)?tusciaup\.it/i, "");
    if (!isEventPath(path)) continue;

    const eventUrl = rawHref.startsWith("http") ? rawHref : `${BASE_URL}${rawHref}`;
    const title = cleanTitle(rawTitle);
    const slug = path.split("/").filter(Boolean).pop() ?? "";
    const { start, end } = parseEventDateHints(`${slug} ${title}`);
    if (!start) continue;

    const city = extractCityFromTitle(title) ?? "Viterbo";

    events.push({
      external_id: eventUrl,
      title,
      start_date: start.toISOString(),
      end_date: end?.toISOString() ?? null,
      venue: city,
      city,
      category: inferCategory(title),
      event_url: eventUrl,
    });
  }

  return dedupeByExternalId(events);
}

function isEventPath(path: string): boolean {
  const lower = path.toLowerCase();
  if (!lower.includes("event")) return false;
  if (lower.includes("/tag/") || lower.includes("/categoria/") || lower.includes("/author/")) return false;
  if (lower === "/eventi/" || lower === "/eventi") return false;
  return /\/eventi?\//.test(lower) || lower.includes("eventi-") || lower.includes("-eventi");
}

function dedupeByExternalId(events: CollectedEvent[]): CollectedEvent[] {
  const map = new Map<string, CollectedEvent>();
  for (const event of events) map.set(event.external_id, event);
  return [...map.values()];
}
