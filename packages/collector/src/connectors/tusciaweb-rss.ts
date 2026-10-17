import { inferComuneFromText } from "@atlas/core";
import type { CollectedEvent } from "../types.js";
import {
  cleanTitle,
  decodeHtmlEntities,
  inferCategory,
  parseItalianDateRange,
  stripHtml,
} from "../normalize.js";
import { collectEventiTusciaRss } from "./rss.js";

/** Feed editoriali con data spesso nel titolo/descrizione (categoria Eventi). */
export async function collectTusciawebEventiRss(feedUrl: string): Promise<CollectedEvent[]> {
  const base = await collectEventiTusciaRss(feedUrl);
  const out: CollectedEvent[] = [];

  for (const event of base) {
    const title = event.title;
    const { start, end } = parseItalianDateRange(title);
    const startDate = start ?? new Date(event.start_date);
    if (Number.isNaN(startDate.getTime())) continue;

    const comuneKey = inferComuneFromText(`${title} ${event.description ?? ""}`);
    const city = comuneKey ? event.city ?? comuneKey : event.city;
    const category = inferCategory(title, [event.category, city ?? ""]);

    out.push({
      ...event,
      start_date: startDate.toISOString(),
      end_date: end?.toISOString() ?? event.end_date ?? null,
      city,
      venue: event.venue ?? city ?? null,
      category,
      title: cleanTitle(decodeHtmlEntities(stripHtml(title))),
    });
  }

  return out;
}
