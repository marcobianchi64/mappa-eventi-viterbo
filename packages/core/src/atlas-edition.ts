import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "./constants.js";

/** Configurazione territorio/edizione Atlas (una per deploy; multi-provincia in futuro). */
export interface AtlasEdition {
  id: string;
  /** Nome luogo nell’intestazione: «Programma eventi a Viterbo». */
  placeName: string;
  /** Contesto breve sotto il titolo: «e provincia», «e Lazio», … */
  placeScope: string;
  mapCenter: [number, number];
  mapZoom: number;
}

export const ATLAS_EDITION: AtlasEdition = {
  id: "viterbo",
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
