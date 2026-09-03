import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "./constants.js";
import type { AtlasGeoContext } from "./atlas-geo.js";

/** Configurazione territorio/edizione Atlas (una per deploy; multi-provincia / nazionale in futuro). */
export interface AtlasEdition {
  id: string;
  /** Chiave territorio DB (es. IT-VT, IT-RM). */
  territoryId: string;
  /** Contesto geo per servizi esterni e collector futuri. */
  geo: AtlasGeoContext;
  /** Nome luogo nell’intestazione: «Programma eventi a Viterbo». */
  placeName: string;
  /** Contesto breve sotto il titolo: «e provincia», «e Lazio», … */
  placeScope: string;
  mapCenter: [number, number];
  mapZoom: number;
}

export const ATLAS_EDITION: AtlasEdition = {
  id: "viterbo",
  territoryId: "IT-VT",
  geo: {
    countryCode: "IT",
    regionSlug: "lazio",
    provinceSlug: "viterbo",
    provinceCode: "VT",
    municipalitySlug: "viterbo",
    municipalityName: "Viterbo",
  },
  placeName: "Viterbo",
  placeScope: "e provincia",
  mapCenter: DEFAULT_MAP_CENTER,
  mapZoom: DEFAULT_MAP_ZOOM,
};

/** Titolo elenco eventi (il territorio è già nel kicker sopra). */
export function getEditionListTitle(_edition: AtlasEdition = ATLAS_EDITION): string {
  return "Programma eventi";
}

/** Sottotitolo territorio per hero e filtri. */
export function getEditionTerritoryLabel(edition: AtlasEdition = ATLAS_EDITION): string {
  const scope = edition.placeScope.trim();
  return scope ? `${edition.placeName} ${scope}` : edition.placeName;
}
