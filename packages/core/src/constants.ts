import type { EventCategory, CategoryMeta } from "./types/event.js";

export const ATLAS_VERSION = "1.1.3";

export const DEFAULT_MAP_CENTER: [number, number] = [42.42, 12.104];
export const DEFAULT_MAP_ZOOM = 10;

/** Tile moderne CARTO Positron — senza API key, adatte ai pin colorati. */
export const MAP_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
export const MAP_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
export const MAP_TILE_SUBDOMAINS = ["a", "b", "c", "d"] as const;

export const CATEGORY_META: Record<EventCategory, CategoryMeta> = {
  music: { label: "Musica", color: "#2563eb", icon: "♪" },
  food: { label: "Enogastronomia", color: "#ea580c", icon: "🍷" },
  culture: { label: "Cultura", color: "#7c3aed", icon: "⌂" },
  sport: { label: "Sport", color: "#16a34a", icon: "⚽" },
  families: { label: "Famiglie", color: "#0891b2", icon: "👨‍👩‍👧" },
  other: { label: "Altri eventi", color: "#64748b", icon: "★" },
};

export const DATE_RANGE_LABELS: Record<string, string> = {
  today: "Oggi",
  tomorrow: "Domani",
  weekend: "Weekend",
  "7": "7 giorni",
  "15": "15 giorni",
  "30": "30 giorni",
  "60": "60 giorni",
};

export const DEFAULT_DATE_RANGE = "15" as const;

export const INTERESTS_STORAGE_KEY = "atlas_interests";

/** Fonte eventi da scoperta manuale (import CSV / tab Scoperta admin) */
export const MANUAL_DISCOVERY_SOURCE_ID = "src-manual-discovery";

/** Numero WhatsApp operazioni (solo cifre, es. 393331234567). Configurare in .env */
export const DEFAULT_OPS_WHATSAPP = "";
