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

const BASE_URL = "https://www.viterbotoday.it";

export async function collectViterboTodayHtml(pageUrl: string): Promise<CollectedEvent[]> {
  const html = await fetchHtml(pageUrl);
  return parseViterboTodayListing(html);
}

export function parseViterboTodayListing(html: string): CollectedEvent[] {
  const events: CollectedEvent[] = [];
  const chunks = html.split(/<article class="c-card\b/i);

  for (const chunk of chunks.slice(1)) {
    const pathMatch = chunk.match(/href="(\/eventi\/[a-z0-9][a-z0-9-]*\.html)"/i);
    if (!pathMatch) continue;

    const path = pathMatch[1];
    if (path.includes("/tipo/") || path.includes("/location/")) continue;

    const title =
      decodeHtmlEntities(
        stripHtml(
          chunk.match(/class="o-link-text[^"]*"[^>]*aria-label="([^"]+)"/i)?.[1] ??
            chunk.match(/aria-label="([^"]+)"[^>]*class="o-link-text/i)?.[1] ??
            chunk.match(/<h2[^>]*class="c-card__heading[^"]*"[^>]*>([\s\S]*?)<\/h2>/i)?.[1] ??
            "",
        ),
      ) || decodeHtmlEntities(stripHtml(path.split("/").pop()?.replace(".html", "").replace(/-/g, " ") ?? ""));

    if (!title) continue;

    const kicker = stripHtml(chunk.match(/class="c-card__kicker[^"]*"[^>]*>([^<]+)/i)?.[1] ?? "");
    const locationLabel = decodeHtmlEntities(
      stripHtml(
        chunk.match(/href="\/eventi\/location\/[^"]*"[^>]*>\s*<span[^>]*>\s*([^<]+)/i)?.[1] ??
          chunk.match(/aria-label="([^"]+)"[^>]*class="c-card__link"/i)?.[1] ??
          "",
      ),
    );

    const dateText = stripHtml(chunk.match(/icon-calendar[\s\S]{0,400}?<span[^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? "");
    const slug = path.split("/").pop()?.replace(".html", "") ?? "";
    const { start, end } = parseEventDateHints(`${dateText} ${slug} ${title}`);
    if (!start) continue;

    const city = extractCityFromTitle(title) ?? extractCityFromTitle(locationLabel) ?? "Viterbo";
    const eventUrl = path.startsWith("http") ? path : `${BASE_URL}${path}`;

    events.push({
      external_id: eventUrl,
      title: cleanTitle(title),
      start_date: start.toISOString(),
      end_date: end?.toISOString() ?? null,
      venue: locationLabel || null,
      city,
      category: inferCategory(`${title} ${kicker} ${locationLabel}`, [kicker]),
      event_url: eventUrl,
      image_url: extractImageUrl(chunk),
    });
  }

  return dedupeByExternalId(events);
}

function extractImageUrl(chunk: string): string | undefined {
  const src = chunk.match(/<img[^>]+src="([^"]+)"/i)?.[1];
  if (!src) return undefined;
  if (src.startsWith("//")) return `https:${src}`;
  if (src.startsWith("/")) return `${BASE_URL}${src}`;
  return src;
}

function dedupeByExternalId(events: CollectedEvent[]): CollectedEvent[] {
  const map = new Map<string, CollectedEvent>();
  for (const event of events) map.set(event.external_id, event);
  return [...map.values()];
}
