/**
 * Pin mappa condivisi tra web e admin.
 * Usa classi CSS da packages/core/styles/atlas-map-ui.css
 */
import { getCategoryMeta } from "./utils.js";
import { getMapMarkerIconLayout, getMapUiScale } from "./map-ui-scale.js";

export type AtlasMapMarkerIconSpec = {
  html: string;
  iconSize: [number, number];
  iconAnchor: [number, number];
  popupAnchor: [number, number];
  tooltipAnchor: [number, number];
};

export function createAtlasMapMarkerIcon(category: string): AtlasMapMarkerIconSpec {
  const meta = getCategoryMeta(category);
  const layout = getMapMarkerIconLayout(getMapUiScale().markerSizePx);
  return {
    html: `<div class="atlas-marker" style="background:${meta.color}"><span>${meta.icon}</span></div>`,
    ...layout,
  };
}

export function createAtlasDraftMarkerIcon(): AtlasMapMarkerIconSpec {
  const layout = getMapMarkerIconLayout(getMapUiScale().markerSizePx);
  return {
    html: `<div class="draft-marker"></div>`,
    ...layout,
  };
}

/** Classe tooltip Leaflet standard Atlas (override font 12px). */
export const ATLAS_MAP_TOOLTIP_CLASS = "atlas-event-tooltip";
