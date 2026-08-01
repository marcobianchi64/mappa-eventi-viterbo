import type { DiscoveryRow } from "./discovery-parse.js";
import { assessEventLocation, type EventLocationConfidence } from "./event-location-confidence.js";
import { formatComuneLabel, geocodeEventPlace, resolveEventComuneKey } from "./viterbo-geocode.js";
import { isHttpUrl } from "./safe-url.js";

export type DiscoveryQualityTier = "green" | "yellow" | "red";

export interface DiscoveryQualityAssessment {
  tier: DiscoveryQualityTier;
  label: string;
  hints: string[];
  locationConfidence: EventLocationConfidence;
  allowDirections: boolean;
}

const TIER_LABEL: Record<DiscoveryQualityTier, string> = {
  green: "Alta — ok per mappa e Guidami",
  yellow: "Media — pubblicabile, controlla luogo o link",
  red: "Bassa — verifica prima di pubblicare",
};

/** Valutazione rapida riga Scoperta (pre-pubblicazione). */
export function assessDiscoveryRowQuality(row: DiscoveryRow): DiscoveryQualityAssessment {
  const place = geocodeEventPlace({
    comune: row.comune,
    venue: row.luogo,
    title: row.titolo,
  });
  const comuneKey =
    place.comuneKey ??
    resolveEventComuneKey({
      comune: row.comune,
      venue: row.luogo,
      title: row.titolo,
    });
  const comune = comuneKey ? formatComuneLabel(comuneKey) : row.comune?.trim() || null;

  const location = assessEventLocation({
    lat: place.lat,
    lng: place.lng,
    comune,
    city: comune,
    venue: row.luogo?.trim() || null,
    title: row.titolo?.trim() || "",
    location: null,
  });

  const hints: string[] = [];
  let tier: DiscoveryQualityTier = "green";

  if (!row.comune?.trim() && !comuneKey) {
    tier = "red";
    hints.push("Comune mancante o non riconosciuto");
  }

  if (location.confidence === "low") {
    tier = "red";
    hints.push("Posizione non affidabile per la mappa");
  } else if (location.confidence === "medium") {
    if (tier === "green") tier = "yellow";
    hints.push("Luogo da confermare (Guidami può essere disattivato)");
  }

  if (!isHttpUrl(row.url_evento)) {
    if (tier === "green") tier = "yellow";
    hints.push("Manca URL pagina ufficiale (locandina e verifica più difficili)");
  }

  const venue = row.luogo?.trim() ?? "";
  if (venue.length < 8) {
    if (tier === "green") tier = "yellow";
    hints.push("Luogo poco specifico");
  }

  if (!location.allowDirections && tier === "green") {
    tier = "yellow";
    hints.push("Guidami non disponibile con questi dati");
  }

  if (location.warnings[0] && tier !== "red") {
    hints.push(location.warnings[0]);
  }

  return {
    tier,
    label: TIER_LABEL[tier],
    hints: [...new Set(hints)].slice(0, 4),
    locationConfidence: location.confidence,
    allowDirections: location.allowDirections,
  };
}
