import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = resolve(__dirname, "../data/geocode-cache.json");

interface CacheEntry {
  lat: number;
  lng: number;
}

type GeocodeCache = Record<string, CacheEntry>;

const VITERBO_CENTER = { lat: 42.4207, lng: 12.1042 };

export async function geocodePlace(query: string): Promise<{ lat: number; lng: number } | null> {
  const key = query.trim().toLowerCase();
  if (!key) return null;

  const cache = loadCache();
  if (cache[key]) return cache[key];

  await sleep(1100);

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "it");

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "ProjectAtlas/1.0 (marcobianchi64@users.noreply.github.com)",
      },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as Array<{ lat: string; lon: string }>;
    if (!data[0]) return null;

    const entry = { lat: Number(data[0].lat), lng: Number(data[0].lon) };
    if (!Number.isFinite(entry.lat) || !Number.isFinite(entry.lng)) return null;

    cache[key] = entry;
    saveCache(cache);
    return entry;
  } catch {
    return null;
  }
}

export async function geocodeEvent(venue?: string | null, city?: string | null): Promise<{ lat: number; lng: number }> {
  const parts = [venue, city, "Provincia di Viterbo", "Italia"].filter(Boolean);
  const coords = await geocodePlace(parts.join(", "));
  return coords ?? VITERBO_CENTER;
}

function loadCache(): GeocodeCache {
  if (!existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CACHE_PATH, "utf8")) as GeocodeCache;
  } catch {
    return {};
  }
}

function saveCache(cache: GeocodeCache): void {
  mkdirSync(dirname(CACHE_PATH), { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
