import { XMLParser } from "fast-xml-parser";
import type { CollectedEvent } from "../types.js";
import {
  cleanTitle,
  decodeHtmlEntities,
  inferCategory,
  parseItalianDateRange,
  parseTusciaEventiDescription,
  stripHtml,
} from "../normalize.js";

interface RssItem {
  title?: string;
  link?: string;
  guid?: string | { "#text"?: string };
  pubDate?: string;
  description?: string;
  category?: string | string[];
}

export async function collectTusciaEventiRss(feedUrl: string): Promise<CollectedEvent[]> {
  const xml = await fetchText(feedUrl);
  const items = parseRssItems(xml);
  const out: CollectedEvent[] = [];

  for (const item of items) {
    const link = String(item.link ?? "").trim();
    const title = cleanTitle(decodeHtmlEntities(stripHtml(String(item.title ?? ""))));
    if (!link || !title) continue;

    const parsed = parseTusciaEventiDescription(String(item.description ?? ""));
    const start = parsed.start ?? (item.pubDate ? new Date(item.pubDate) : null);
    if (!start || Number.isNaN(start.getTime())) continue;

    const end = parsed.end ?? null;
    const category = inferCategory(title, ["GUSTO", parsed.venue ?? "", parsed.city ?? ""]);

    out.push({
      external_id: link,
      title,
      description: stripHtml(String(item.description ?? "")).slice(0, 500) || undefined,
      start_date: start.toISOString(),
      end_date: end?.toISOString() ?? null,
      venue: parsed.venue,
      city: parsed.city,
      category,
      event_url: link,
    });
  }

  return dedupeByExternalId(out);
}

export async function collectEventiTusciaRss(feedUrl: string): Promise<CollectedEvent[]> {
  const xml = await fetchText(feedUrl);
  const items = parseRssItems(xml);
  const out: CollectedEvent[] = [];

  for (const item of items) {
    const link = String(item.link ?? "").trim();
    const rawTitle = decodeHtmlEntities(stripHtml(String(item.title ?? "")));
    const title = cleanTitle(rawTitle);
    if (!link || !title) continue;

    const categories = normalizeCategories(item.category);
    const { start, end } = parseItalianDateRange(rawTitle);
    const fallbackStart = item.pubDate ? new Date(item.pubDate) : null;
    const startDate = start ?? fallbackStart;
    if (!startDate || Number.isNaN(startDate.getTime())) continue;

    const city = extractCityFromPipeTitle(rawTitle);
    const category = inferCategory(`${rawTitle} ${categories.join(" ")}`, categories);

    out.push({
      external_id: link,
      title,
      description: stripHtml(String(item.description ?? "")).slice(0, 500) || undefined,
      start_date: startDate.toISOString(),
      end_date: end?.toISOString() ?? null,
      venue: city,
      city,
      category,
      event_url: link,
    });
  }

  return dedupeByExternalId(out);
}

function extractCityFromPipeTitle(title: string): string | null {
  const match = title.match(/\|\s*[^|]+\|\s*([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s']+?)\s*[-–]/);
  return match?.[1]?.trim() ?? null;
}

function normalizeCategories(category: RssItem["category"]): string[] {
  if (!category) return [];
  const list = Array.isArray(category) ? category : [category];
  return list.map((c) => stripHtml(String(c)));
}

function parseRssItems(xml: string): RssItem[] {
  const parser = new XMLParser({ ignoreAttributes: false });
  const doc = parser.parse(xml);
  const items = doc?.rss?.channel?.item ?? [];
  return Array.isArray(items) ? items : [items];
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "ProjectAtlas/1.0 (+https://github.com/marcobianchi64/mappa-eventi-viterbo)",
      Accept: "application/rss+xml, application/xml, text/xml, text/html",
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} per ${url}`);
  return response.text();
}

function dedupeByExternalId(events: CollectedEvent[]): CollectedEvent[] {
  const map = new Map<string, CollectedEvent>();
  for (const event of events) map.set(event.external_id, event);
  return [...map.values()];
}

