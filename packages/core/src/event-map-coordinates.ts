import type { AtlasEvent } from "./types/event.js";
import {
  distanceKm,
  geocodeEventPlace,
  isLegacyViterboCenter,
  VITERBO_PROVINCE_CENTER,
} from "./viterbo-geocode.js";

/** Se il pin salvato è più lontano del previsto dal comune/luogo testuale, si usa il geocoding aggiornato. */
export const MAP_MARKER_COORD_TRUST_KM = 2.5;

export type MapMarkerCoordinateResolution = {
  lat: number;
  lng: number;
  adjusted: boolean;
  reason?: "missing" | "viterbo-fallback" | "far-from-place" | "ok";
};

export function isDefaultViterboCenterCoords(lat: number, lng: number): boolean {
  if (isLegacyViterboCenter(lat, lng)) return true;
  return (
    Math.abs(lat - VITERBO_PROVINCE_CENTER.lat) < 0.004 &&
    Math.abs(lng - VITERBO_PROVINCE_CENTER.lng) < 0.004
  );
}

/**
 * Coordinate per il pin in mappa: corregge eventi legacy (centro Viterbo, comune sbagliato in DB)
 * senza richiedere migrazioni manuali. La fonte di verità è comune + luogo + titolo (provincia VT).
 */
export function resolveMapMarkerCoordinates(
  event: Pick<AtlasEvent, "lat" | "lng" | "comune" | "city" | "venue" | "title" | "location">,
): MapMarkerCoordinateResolution {
  const place = geocodeEventPlace(event);
  const lat = Number(event.lat);
  const lng = Number(event.lng);
  const hasDb = Number.isFinite(lat) && Number.isFinite(lng);
  const hasPlace = Boolean(place.comuneKey || place.localitaKey);

  if (!hasPlace) {
    if (hasDb) return { lat, lng, adjusted: false, reason: "ok" };
    return { lat: place.lat, lng: place.lng, adjusted: true, reason: "missing" };
  }

  if (!hasDb) {
    return { lat: place.lat, lng: place.lng, adjusted: true, reason: "missing" };
  }

  if (isDefaultViterboCenterCoords(lat, lng)) {
    return { lat: place.lat, lng: place.lng, adjusted: true, reason: "viterbo-fallback" };
  }

  const dist = distanceKm(lat, lng, place.lat, place.lng);
  if (dist > MAP_MARKER_COORD_TRUST_KM) {
    return { lat: place.lat, lng: place.lng, adjusted: true, reason: "far-from-place" };
  }

  return { lat, lng, adjusted: false, reason: "ok" };
}

export function withMapAlignedCoordinates<T extends AtlasEvent>(event: T): T {
  const resolved = resolveMapMarkerCoordinates(event);
  if (!resolved.adjusted) return event;
  return { ...event, lat: resolved.lat, lng: resolved.lng };
}
