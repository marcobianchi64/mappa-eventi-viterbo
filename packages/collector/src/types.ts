import type { EventCategory } from "@atlas/core";

export interface CollectedEvent {
  external_id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string | null;
  venue?: string | null;
  city?: string | null;
  category: EventCategory;
  event_url: string;
  image_url?: string | null;
  lat?: number;
  lng?: number;
}

export interface SourceConnectorConfig {
  id: string;
  name: string;
  reliability: "A" | "B" | "C";
  territory_id: string;
  connector: "rss-tuscia-eventi" | "rss-eventi-tuscia" | "html-comune-viterbo" | "html-viterbotoday" | "html-tusciaup";
  feed_url?: string;
  page_url?: string;
}

export interface CollectResult {
  source_id: string;
  events: CollectedEvent[];
  errors: string[];
}

export interface SyncStats {
  found: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export const AUTO_SOURCES: SourceConnectorConfig[] = [
  {
    id: "src-tuscia-eventi",
    name: "Tuscia Eventi",
    reliability: "B",
    territory_id: "IT-VT",
    connector: "rss-tuscia-eventi",
    feed_url: "https://www.tusciaeventi.it/eventi/feed/",
  },
  {
    id: "src-eventi-tuscia",
    name: "Eventi della Tuscia",
    reliability: "B",
    territory_id: "IT-VT",
    connector: "rss-eventi-tuscia",
    feed_url: "https://www.eventidellatuscia.it/feed/",
  },
  {
    id: "src-comune-viterbo",
    name: "Comune di Viterbo",
    reliability: "A",
    territory_id: "IT-VT-VITERBO",
    connector: "html-comune-viterbo",
    page_url: "https://comune.viterbo.it/vivere-il-comune/eventi/",
  },
  {
    id: "src-viterbotoday",
    name: "ViterboToday — Eventi",
    reliability: "B",
    territory_id: "IT-VT",
    connector: "html-viterbotoday",
    page_url: "https://www.viterbotoday.it/eventi/",
  },
  {
    id: "src-tusciaup",
    name: "TusciaUp — Eventi",
    reliability: "B",
    territory_id: "IT-VT",
    connector: "html-tusciaup",
    page_url: "https://www.tusciaup.it/eventi/",
  },
];
