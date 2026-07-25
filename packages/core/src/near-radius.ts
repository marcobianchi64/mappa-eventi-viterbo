import type { AtlasEvent } from "./types/event.js";
import { distanceKm } from "./viterbo-geocode.js";
import { hasValidEventCoords } from "./utils.js";

/** Modalità distanza «Eventi vicino a te» (contesti diversi). */
export type NearRadiusPreset = "city" | "province";

export const NEAR_RADIUS_STORAGE_KEY = "atlas_near_radius_preset";

export interface NearRadiusOption {
  preset: NearRadiusPreset;
  label: string;
  shortLabel: string;
  radiusKm: number;
  hint: string;
}

/** Preset ispirati a mappe/eventi: raggio compatto in città, ampio in provincia. */
export const NEAR_RADIUS_OPTIONS: Record<NearRadiusPreset, NearRadiusOption> = {
  city: {
    preset: "city",
    label: "In città",
    shortLabel: "15 km",
    radiusKm: 15,
    hint: "Ideale in centro o zone dense di eventi",
  },
  province: {
    preset: "province",
    label: "In provincia",
    shortLabel: "45 km",
    radiusKm: 45,
    hint: "Consigliato in Tuscia e aree rurali (default Atlas)",
  },
};

export const DEFAULT_NEAR_RADIUS_PRESET: NearRadiusPreset = "province";

export function getNearRadiusOption(preset?: NearRadiusPreset | null): NearRadiusOption {
  const key = preset && preset in NEAR_RADIUS_OPTIONS ? preset : DEFAULT_NEAR_RADIUS_PRESET;
  return NEAR_RADIUS_OPTIONS[key];
}

export function loadNearRadiusPreset(): NearRadiusPreset {
  try {
    const raw = localStorage.getItem(NEAR_RADIUS_STORAGE_KEY);
    if (raw === "city" || raw === "province") return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_NEAR_RADIUS_PRESET;
}

export function saveNearRadiusPreset(preset: NearRadiusPreset): void {
  try {
    localStorage.setItem(NEAR_RADIUS_STORAGE_KEY, preset);
  } catch {
    /* ignore */
  }
}

export function filterEventsWithinRadiusKm(
  events: AtlasEvent[],
  originLat: number,
  originLng: number,
  radiusKm: number,
): AtlasEvent[] {
  if (!Number.isFinite(originLat) || !Number.isFinite(originLng)) return [];
  return events.filter((event) => {
    if (!hasValidEventCoords(event)) return false;
    return distanceKm(originLat, originLng, event.lat, event.lng) <= radiusKm;
  });
}

export function renderNearRadiusChips(active: NearRadiusPreset): string {
  const options = [NEAR_RADIUS_OPTIONS.city, NEAR_RADIUS_OPTIONS.province];
  return options
    .map((opt) => {
      const isActive = opt.preset === active;
      return `<button type="button" class="near-radius-chip${isActive ? " active" : ""}" data-near-radius="${opt.preset}" aria-pressed="${isActive}">${opt.label} · ${opt.shortLabel}</button>`;
    })
    .join("");
}
