import type { AtlasEvent } from "./types/event.js";
import { getEventComuneDisplayLabel, getEventVenueDisplay } from "./event-venue-display.js";
import {
  MAP_MARKER_COORD_TRUST_KM,
  resolveMapMarkerCoordinates,
  type MapMarkerCoordinateResolution,
} from "./event-map-coordinates.js";
import { inferLocalitaFromText } from "./viterbo-frazioni.js";
import {
  distanceKm,
  geocodeEventPlace,
  resolveEventComuneKey,
} from "./viterbo-geocode.js";

/** Affidabilità posizione per pin e navigazione stradale. */
export type EventLocationConfidence = "high" | "medium" | "low";

export type EventLocationAssessment = {
  confidence: EventLocationConfidence;
  /** Coordinate da usare per il pin in mappa. */
  lat: number;
  lng: number;
  placeLabel: string;
  /** Solo con "high": sicuro aprire Google Maps / Guidami. */
  allowDirections: boolean;
  /** Motivi per UI (tooltip, scheda). */
  warnings: string[];
  resolution: MapMarkerCoordinateResolution;
};

const VAGUE_VENUE =
  /^(centro|centro storico|piazza|locale|varie|tbd|da definire|da confermare)$/i;

function venueLooksSpecific(venue: string | null | undefined): boolean {
  const v = venue?.trim() ?? "";
  if (v.length < 8) return false;
  if (VAGUE_VENUE.test(v)) return false;
  if (/\b(via|piazza|corso|vicolo|largo|contrada|frazione|località)\b/i.test(v)) return true;
  if (v.includes(",")) return true;
  return v.length >= 18;
}

function hasComuneConflict(
  event: Pick<AtlasEvent, "comune" | "city" | "venue" | "title" | "location">,
  targetKey: string | null,
): boolean {
  if (!targetKey) return false;
  const declared = resolveEventComuneKey({
    comune: event.comune,
    city: null,
    venue: null,
    title: null,
    location: null,
  });
  const declaredCity = resolveEventComuneKey({
    comune: null,
    city: event.city,
    venue: null,
    title: null,
    location: null,
  });
  const keys = new Set([declared, declaredCity].filter(Boolean) as string[]);
  if (keys.size > 1 && keys.has("viterbo") && targetKey !== "viterbo") return true;
  if (declared && declared !== targetKey && declared !== "viterbo") return true;
  return false;
}

/**
 * Valuta se possiamo offrire navigazione stradale (Google Maps) senza rischiare recensioni negative.
 * Regola: Guidami solo con confidenza "high"; altrimenti pin approssimativo e messaggio chiaro.
 */
export function assessEventLocation(
  event: Pick<
    AtlasEvent,
    "lat" | "lng" | "comune" | "city" | "venue" | "title" | "location"
  >,
): EventLocationAssessment {
  const resolution = resolveMapMarkerCoordinates(event);
  const place = geocodeEventPlace(event);
  const targetKey = resolveEventComuneKey(event);
  const localitaKey = inferLocalitaFromText(
    event.venue,
    event.location,
    event.title,
    event.comune,
    event.city,
  );
  const placeLabel = getEventVenueDisplay(event) || getEventComuneDisplayLabel(event) || "Luogo da confermare";
  const warnings: string[] = [];

  const dbLat = Number(event.lat);
  const dbLng = Number(event.lng);
  const hasDb = Number.isFinite(dbLat) && Number.isFinite(dbLng);
  const distToExpected = hasDb
    ? distanceKm(dbLat, dbLng, resolution.lat, resolution.lng)
    : Number.POSITIVE_INFINITY;

  if (!targetKey && !place.localitaKey) {
    warnings.push("Non abbiamo identificato il comune con sufficiente certezza.");
    return {
      confidence: "low",
      lat: resolution.lat,
      lng: resolution.lng,
      placeLabel,
      allowDirections: false,
      warnings,
      resolution,
    };
  }

  if (resolution.adjusted) {
    warnings.push(
      "Posizione ricostruita dal testo dell'evento: verifica il luogo prima di partire.",
    );
  }

  if (hasComuneConflict(event, targetKey)) {
    warnings.push("I dati di comune e luogo non sono allineati: posizione da confermare.");
  }

  const specificVenue = venueLooksSpecific(event.venue);
  const hasFrazione = Boolean(localitaKey || place.localitaKey);

  let confidence: EventLocationConfidence = "medium";

  const trustedCoords =
    hasDb &&
    !resolution.adjusted &&
    distToExpected <= MAP_MARKER_COORD_TRUST_KM;

  const canPinHigh =
    trustedCoords &&
    (specificVenue || hasFrazione) &&
    !hasComuneConflict(event, targetKey) &&
    warnings.length === 0;

  const canComuneOnlyHigh =
    trustedCoords &&
    Boolean(targetKey) &&
    targetKey !== "viterbo" &&
    !hasComuneConflict(event, targetKey) &&
    warnings.length === 0 &&
    !specificVenue;

  if (canPinHigh || canComuneOnlyHigh) {
    confidence = "high";
  } else if (!targetKey && !place.localitaKey) {
    confidence = "low";
  } else if (resolution.adjusted || hasComuneConflict(event, targetKey) || !specificVenue) {
    confidence = "medium";
  }

  if (targetKey === "viterbo" && !hasFrazione && !specificVenue) {
    confidence = "low";
    warnings.push("Evento in area Viterbo senza indirizzo preciso: non usare il navigatore automatico.");
  }

  const allowDirections = confidence === "high";

  if (!allowDirections && confidence !== "low") {
    warnings.push("Indicazioni stradali non disponibili: controlla luogo e orario con l'organizzatore.");
  }

  return {
    confidence,
    lat: resolution.lat,
    lng: resolution.lng,
    placeLabel,
    allowDirections,
    warnings,
    resolution,
  };
}

export function withAssessedMapCoordinates<T extends AtlasEvent>(event: T): T & {
  locationAssessment: EventLocationAssessment;
} {
  const locationAssessment = assessEventLocation(event);
  return {
    ...event,
    lat: locationAssessment.lat,
    lng: locationAssessment.lng,
    locationAssessment,
  };
}
