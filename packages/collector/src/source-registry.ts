import { createClient } from "@supabase/supabase-js";
import { AUTO_SOURCES, type DbSourceRow, type SourceConnectorConfig } from "./types.js";

const CONNECTOR_URL_KEYS: Record<string, { feed?: string; page?: string }> = {
  "rss-tuscia-eventi": { feed: "feed_url" },
  "rss-eventi-tuscia": { feed: "feed_url" },
  "rss-tusciaweb-eventi": { feed: "feed_url" },
  "html-comune-viterbo": { page: "page_url" },
  "html-viterbotoday": { page: "page_url" },
  "html-tusciaup": { page: "page_url" },
};

function rowToConfig(row: DbSourceRow): SourceConnectorConfig | null {
  const connector = row.connector as SourceConnectorConfig["connector"] | null;
  if (!connector || !CONNECTOR_URL_KEYS[connector]) return null;

  const cfg = row.connector_config ?? {};
  const keys = CONNECTOR_URL_KEYS[connector];
  const feed_url = keys.feed ? String(cfg[keys.feed] ?? "").trim() : undefined;
  const page_url = keys.page ? String(cfg[keys.page] ?? "").trim() : undefined;

  if (keys.feed && !feed_url) return null;
  if (keys.page && !page_url) return null;

  return {
    id: row.id,
    name: row.name,
    reliability: row.reliability,
    territory_id: row.territory_id ?? "IT-VT",
    connector,
    feed_url,
    page_url,
  };
}

function staticFallback(sourceIds?: string[]): SourceConnectorConfig[] {
  const list = AUTO_SOURCES.filter((s) =>
    sourceIds?.length ? sourceIds.includes(s.id) : true,
  );
  return list;
}

export async function loadCollectorSources(options: {
  supabaseUrl: string;
  serviceRoleKey: string;
  sourceIds?: string[];
}): Promise<SourceConnectorConfig[]> {
  const client = createClient(options.supabaseUrl, options.serviceRoleKey);

  const { data, error } = await client
    .from("sources")
    .select("id,name,territory_id,reliability,acquisition_mode,status,connector,connector_config,url")
    .eq("status", "active")
    .eq("acquisition_mode", "automatic");

  if (error || !data?.length) {
    console.warn(
      error
        ? `Registry fonti DB non disponibile (${error.message}); uso AUTO_SOURCES.`
        : "Nessuna fonte automatica in DB; uso AUTO_SOURCES.",
    );
    return staticFallback(options.sourceIds);
  }

  const fromDb: SourceConnectorConfig[] = [];
  for (const row of data as DbSourceRow[]) {
    const config = rowToConfig(row);
    if (config) fromDb.push(config);
  }

  if (fromDb.length === 0) {
    console.warn("Fonti DB senza connettori validi; uso AUTO_SOURCES.");
    return staticFallback(options.sourceIds);
  }

  const filtered = options.sourceIds?.length
    ? fromDb.filter((s) => options.sourceIds!.includes(s.id))
    : fromDb;

  return filtered.sort((a, b) => a.id.localeCompare(b.id));
}
