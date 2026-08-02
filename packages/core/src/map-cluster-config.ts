import { DEFAULT_MAP_ZOOM } from "./constants.js";

/** A zoom provinciale (10) e oltre: pin singoli, mappa subito leggibile. */
export const MAP_CLUSTER_DISABLE_AT_ZOOM = DEFAULT_MAP_ZOOM;

/** Anteprima massima nel tooltip hover festival (il resto è nel pannello al click). */
export const FESTIVAL_MAP_TOOLTIP_PREVIEW_MAX = 6;

/** Raggruppa con numero centrale solo se almeno N eventi vicini. */
export const MAP_CLUSTER_MIN_MARKERS = 8;

export function resolveMaxClusterRadius(zoom: number): number {
  if (zoom >= MAP_CLUSTER_DISABLE_AT_ZOOM) return 0;
  if (zoom <= 7) return 72;
  if (zoom <= 8) return 52;
  return 36;
}

/** Opzioni condivise per leaflet.markercluster (web/admin). */
export function createAtlasMarkerClusterGroupOptions(
  minSize = MAP_CLUSTER_MIN_MARKERS,
): Record<string, unknown> {
  return {
    atlasMinClusterSize: minSize,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    disableClusteringAtZoom: MAP_CLUSTER_DISABLE_AT_ZOOM,
    maxClusterRadius: resolveMaxClusterRadius,
  };
}
