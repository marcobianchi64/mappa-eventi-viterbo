import type { AtlasEvent } from "./types/event.js";
import { getEventComuneDisplayLabel } from "./event-venue-display.js";
import {
  distanceKm,
  geocodeEventPlace,
  getComuneCenterByKey,
  isLegacyViterboCenter,
  isNearViterboUrbanArea,
  resolveComuneKeyFromString,
  resolveEventComuneKey,
  VITERBO_PROVINCE_CENTER,
} from "./viterbo-geocode.js";

/** Se il pin salvato è più lontano del previsto dal comune/luogo testuale, si usa il geocoding aggiornato. */
export const MAP_MARKER_COORD_TRUST_KM = 2.5;

export type MapMarkerCoordinateResolution = {
  lat: number;
  lng: number;
  adjusted: boolean;
  reason?: "missing" | "viterbo-fallback" | "far-from-place" | "misplaced-in-viterbo" | "ok";
};

export function isDefaultViterboCenterCoords(lat: number, lng: number): boolean {
  if (isLegacyViterboCenter(lat, lng)) return true;
  return (
    Math.abs(lat - VITERBO_PROVINCE_CENTER.lat) < 0.004 &&
    Math.abs(lng - VITERBO_PROVINCE_CENTER.lng) < 0.004
  );
}

function resolveTargetComuneKey(
  event: Pick<AtlasEvent, "lat" | "lng" | "comune" | "city" | "venue" | "title" | "location">,
): string | null {
  return (
    resolveEventComuneKey(event) ??
    resolveComuneKeyFromString(getEventComuneDisplayLabel(event)) ??
    resolveComuneKeyFromString(event.comune ?? "") ??
    resolveComuneKeyFromString(event.city ?? "")
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
  const targetKey = resolveTargetComuneKey(event);
  const targetCoords = targetKey ? getComuneCenterByKey(targetKey) : null;

  const lat = Number(event.lat);
  const lng = Number(event.lng);
  const hasDb = Number.isFinite(lat) && Number.isFinite(lng);

  const expectedLat = targetCoords?.lat ?? place.lat;
  const expectedLng = targetCoords?.lng ?? place.lng;
  const hasExpected =
    Boolean(targetKey || place.comuneKey || place.localitaKey) &&
    Number.isFinite(expectedLat) &&
    Number.isFinite(expectedLng);

  if (!hasDb) {
    if (!hasExpected) {
      return { lat: place.lat, lng: place.lng, adjusted: true, reason: "missing" };
    }
    return { lat: expectedLat, lng: expectedLng, adjusted: true, reason: "missing" };
  }

  if (!hasExpected) {
    return { lat, lng, adjusted: false, reason: "ok" };
  }

  if (isDefaultViterboCenterCoords(lat, lng) && targetKey && targetKey !== "viterbo") {
    return { lat: expectedLat, lng: expectedLng, adjusted: true, reason: "viterbo-fallback" };
  }

  const dist = distanceKm(lat, lng, expectedLat, expectedLng);
  if (dist > MAP_MARKER_COORD_TRUST_KM) {
    return { lat: expectedLat, lng: expectedLng, adjusted: true, reason: "far-from-place" };
  }

  if (
    targetKey &&
    targetKey !== "viterbo" &&
    isNearViterboUrbanArea(lat, lng, 6)
  ) {
    return { lat: expectedLat, lng: expectedLng, adjusted: true, reason: "misplaced-in-viterbo" };
  }

  return { lat, lng, adjusted: false, reason: "ok" };
}

export function withMapAlignedCoordinates<T extends AtlasEvent>(event: T): T {
  const resolved = resolveMapMarkerCoordinates(event);
  if (!resolved.adjusted) return event;
  return { ...event, lat: resolved.lat, lng: resolved.lng };
}
