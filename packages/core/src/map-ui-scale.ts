/**
 * Scala UI mappa — token responsive desktop/mobile.
 *
 * Riferimenti accessibilità:
 * - Touch target minimo: 48px (Material / WCAG 2.5.5)
 * - Testo corpo minimo leggibile: 16px (18px qui)
 * - Pin mappa: sopra il minimo touch, visibili a zoom provinciale
 */
export const MAP_UI_BREAKPOINT_PX = 760;

export type MapUiScaleTokens = {
  markerSizePx: number;
  markerBorderPx: number;
  markerIconFontPx: number;
  tooltipWidthPx: number;
  tooltipMinWidthPx: number;
  tooltipPaddingPx: number;
  tooltipFontPx: number;
  tooltipTitleFontPx: number;
  panelWidthPx: number;
  filterPanelWidthPx: number;
  programsPanelWidthPx: number;
  baseFontPx: number;
  panelLabelFontPx: number;
  panelInputFontPx: number;
  chipFontPx: number;
  legendFontPx: number;
  filterOptionFontPx: number;
};

/** Desktop: pin e testo comodi con mouse, testo ≥18px. */
export const MAP_UI_SCALE_DESKTOP: MapUiScaleTokens = {
  markerSizePx: 68,
  markerBorderPx: 3,
  markerIconFontPx: 30,
  tooltipWidthPx: 400,
  tooltipMinWidthPx: 320,
  tooltipPaddingPx: 18,
  tooltipFontPx: 18,
  tooltipTitleFontPx: 23,
  panelWidthPx: 460,
  filterPanelWidthPx: 380,
  programsPanelWidthPx: 420,
  baseFontPx: 18,
  panelLabelFontPx: 18,
  panelInputFontPx: 18,
  chipFontPx: 17,
  legendFontPx: 16,
  filterOptionFontPx: 17,
};

/** Mobile: pin più grandi per tap con pollice, testo invariato o leggermente più alto. */
export const MAP_UI_SCALE_MOBILE: MapUiScaleTokens = {
  markerSizePx: 80,
  markerBorderPx: 3,
  markerIconFontPx: 36,
  tooltipWidthPx: 400,
  tooltipMinWidthPx: 300,
  tooltipPaddingPx: 20,
  tooltipFontPx: 19,
  tooltipTitleFontPx: 24,
  panelWidthPx: 460,
  filterPanelWidthPx: 380,
  programsPanelWidthPx: 420,
  baseFontPx: 18,
  panelLabelFontPx: 18,
  panelInputFontPx: 18,
  chipFontPx: 17,
  legendFontPx: 16,
  filterOptionFontPx: 17,
};

/** @deprecated Usare getMapUiScale() — alias desktop per compatibilità script. */
export const MAP_UI_SCALE = MAP_UI_SCALE_DESKTOP;

export type MapMarkerIconLayout = {
  iconSize: [number, number];
  iconAnchor: [number, number];
  popupAnchor: [number, number];
  tooltipAnchor: [number, number];
};

export function isMobileMapViewport(width: number): boolean {
  return width <= MAP_UI_BREAKPOINT_PX;
}

export function getMapUiScale(viewportWidth?: number): MapUiScaleTokens {
  if (typeof viewportWidth === "number") {
    return isMobileMapViewport(viewportWidth) ? MAP_UI_SCALE_MOBILE : MAP_UI_SCALE_DESKTOP;
  }
  if (typeof window !== "undefined") {
    return isMobileMapViewport(window.innerWidth) ? MAP_UI_SCALE_MOBILE : MAP_UI_SCALE_DESKTOP;
  }
  return MAP_UI_SCALE_DESKTOP;
}

export function getMapMarkerIconLayout(
  markerSizePx: number = getMapUiScale().markerSizePx,
): MapMarkerIconLayout {
  const half = markerSizePx / 2;
  const tipOffset = Math.round(markerSizePx * 0.85);
  return {
    iconSize: [markerSizePx, markerSizePx],
    iconAnchor: [half, markerSizePx],
    popupAnchor: [0, -tipOffset],
    tooltipAnchor: [0, -tipOffset],
  };
}

function applyScaleTokens(root: HTMLElement, s: MapUiScaleTokens): void {
  root.style.setProperty("--marker-size", `${s.markerSizePx}px`);
  root.style.setProperty("--marker-border", `${s.markerBorderPx}px`);
  root.style.setProperty("--marker-icon-font", `${s.markerIconFontPx}px`);
  root.style.setProperty("--tooltip-width", `${s.tooltipWidthPx}px`);
  root.style.setProperty("--tooltip-min-width", `${s.tooltipMinWidthPx}px`);
  root.style.setProperty("--tooltip-padding", `${s.tooltipPaddingPx}px`);
  root.style.setProperty("--tooltip-font", `${s.tooltipFontPx}px`);
  root.style.setProperty("--tooltip-title-font", `${s.tooltipTitleFontPx}px`);
  root.style.setProperty("--panel-width", `${s.panelWidthPx}px`);
  root.style.setProperty("--filter-panel-width", `${s.filterPanelWidthPx}px`);
  root.style.setProperty("--programs-panel-width", `${s.programsPanelWidthPx}px`);
  root.style.setProperty("--font-base", `${s.baseFontPx}px`);
  root.style.setProperty("--panel-label-font", `${s.panelLabelFontPx}px`);
  root.style.setProperty("--panel-input-font", `${s.panelInputFontPx}px`);
  root.style.setProperty("--chip-font", `${s.chipFontPx}px`);
  root.style.setProperty("--legend-font", `${s.legendFontPx}px`);
  root.style.setProperty("--filter-option-font", `${s.filterOptionFontPx}px`);
}

/** Allinea le variabili CSS della mappa web ai token del viewport corrente. */
export function applyMapUiScale(root: HTMLElement = document.documentElement): void {
  applyScaleTokens(root, getMapUiScale());
}
