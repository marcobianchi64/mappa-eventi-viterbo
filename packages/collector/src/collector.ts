import type { CollectResult, SourceConnectorConfig } from "./types.js";
import { collectTusciaEventiRss, collectEventiTusciaRss } from "./connectors/rss.js";
import { collectComuneViterboHtml } from "./connectors/comune-viterbo.js";

export async function collectFromSource(source: SourceConnectorConfig): Promise<CollectResult> {
  const errors: string[] = [];
  let events: import("./types.js").CollectedEvent[] = [];

  try {
    if (source.connector === "rss-tuscia-eventi" && source.feed_url) {
      events = await collectTusciaEventiRss(source.feed_url);
    } else if (source.connector === "rss-eventi-tuscia" && source.feed_url) {
      events = await collectEventiTusciaRss(source.feed_url);
    } else if (source.connector === "html-comune-viterbo" && source.page_url) {
      events = await collectComuneViterboHtml(source.page_url);
    } else {
      errors.push(`Connettore non configurato per ${source.id}`);
    }
  } catch (error) {
    errors.push((error as Error).message);
  }

  return { source_id: source.id, events, errors };
}
