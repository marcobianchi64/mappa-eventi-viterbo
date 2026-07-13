import type { EventCategory, CategoryMeta } from "./types/event.js";

export const ATLAS_VERSION = "1.0.0";

export const DEFAULT_MAP_CENTER: [number, number] = [42.42, 12.104];
export const DEFAULT_MAP_ZOOM = 10;

export const CATEGORY_META: Record<EventCategory, CategoryMeta> = {
  music: { label: "Musica", color: "#d92d20", icon: "♪" },
  food: { label: "Enogastronomia", color: "#2e8b57", icon: "🍷" },
  culture: { label: "Cultura", color: "#2f6fed", icon: "⌂" },
  other: { label: "Altri eventi", color: "#7a5af8", icon: "★" },
};

export const DATE_RANGE_LABELS: Record<string, string> = {
  today: "Oggi",
  tomorrow: "Domani",
  weekend: "Weekend",
  "7": "7 giorni",
  "15": "15 giorni",
  "30": "30 giorni",
};

export const DEFAULT_DATE_RANGE = "15" as const;

export const INTERESTS_STORAGE_KEY = "atlas_interests";
