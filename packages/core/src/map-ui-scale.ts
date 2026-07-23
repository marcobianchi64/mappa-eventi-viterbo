/** Versione contratto UI — incrementare solo con revisione esplicita delle dimensioni. */
export const ATLAS_UI_SCALE_CONTRACT_VERSION = 2;

/** Minimi accessibilità (Material / WCAG 2.5.5). Non scendere sotto questi valori. */
export const ATLAS_UI_MIN_TOUCH_PX = 48;
export const ATLAS_UI_MIN_BODY_FONT_PX = 16;
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
  dockWidthPx: number;
  flyoutPanelWidthPx: number;
  panelWidthPx: number;
  filterPanelWidthPx: number;
  programsPanelWidthPx: number;
  baseFontPx: number;
  panelLabelFontPx: number;
  panelInputFontPx: number;
  dockBtnFontPx: number;
  chipFontPx: number;
  legendFontPx: number;
  filterOptionFontPx: number;
  sheetTitleFontPx: number;
  sheetBodyFontPx: number;
  sheetActionFontPx: number;
  sheetBadgeFontPx: number;
};

/** Desktop: testo grande e leggibile (≥20px corpo). */
export const MAP_UI_SCALE_DESKTOP: MapUiScaleTokens = {
  markerSizePx: 68,
  markerBorderPx: 3,
  markerIconFontPx: 30,
  tooltipWidthPx: 420,
  tooltipMinWidthPx: 340,
  tooltipPaddingPx: 20,
  tooltipFontPx: 20,
  tooltipTitleFontPx: 26,
  dockWidthPx: 248,
  flyoutPanelWidthPx: 500,
  panelWidthPx: 500,
  filterPanelWidthPx: 400,
  programsPanelWidthPx: 440,
  baseFontPx: 20,
  panelLabelFontPx: 20,
  panelInputFontPx: 20,
  dockBtnFontPx: 19,
  chipFontPx: 18,
  legendFontPx: 18,
  filterOptionFontPx: 19,
  sheetTitleFontPx: 28,
  sheetBodyFontPx: 20,
  sheetActionFontPx: 15,
  sheetBadgeFontPx: 16,
};

/** Mobile: testo e pin ancora più generosi al tatto. */
export const MAP_UI_SCALE_MOBILE: MapUiScaleTokens = {
  markerSizePx: 80,
  markerBorderPx: 3,
  markerIconFontPx: 36,
  tooltipWidthPx: 420,
  tooltipMinWidthPx: 300,
  tooltipPaddingPx: 22,
  tooltipFontPx: 21,
  tooltipTitleFontPx: 27,
  dockWidthPx: 248,
  flyoutPanelWidthPx: 500,
  panelWidthPx: 500,
  filterPanelWidthPx: 400,
  programsPanelWidthPx: 440,
  baseFontPx: 20,
  panelLabelFontPx: 20,
  panelInputFontPx: 20,
  dockBtnFontPx: 19,
  chipFontPx: 18,
  legendFontPx: 18,
  filterOptionFontPx: 19,
  sheetTitleFontPx: 28,
  sheetBodyFontPx: 20,
  sheetActionFontPx: 15,
  sheetBadgeFontPx: 16,
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
  root.style.setProperty("--dock-width", `${s.dockWidthPx}px`);
  root.style.setProperty("--flyout-panel-width", `${s.flyoutPanelWidthPx}px`);
  root.style.setProperty("--panel-width", `${s.panelWidthPx}px`);
  root.style.setProperty("--filter-panel-width", `${s.filterPanelWidthPx}px`);
  root.style.setProperty("--programs-panel-width", `${s.programsPanelWidthPx}px`);
  root.style.setProperty("--font-base", `${s.baseFontPx}px`);
  root.style.setProperty("--panel-label-font", `${s.panelLabelFontPx}px`);
  root.style.setProperty("--panel-input-font", `${s.panelInputFontPx}px`);
  root.style.setProperty("--dock-btn-font", `${s.dockBtnFontPx}px`);
  root.style.setProperty("--chip-font", `${s.chipFontPx}px`);
  root.style.setProperty("--legend-font", `${s.legendFontPx}px`);
  root.style.setProperty("--filter-option-font", `${s.filterOptionFontPx}px`);
  root.style.setProperty("--sheet-title-font", `${s.sheetTitleFontPx}px`);
  root.style.setProperty("--sheet-body-font", `${s.sheetBodyFontPx}px`);
  root.style.setProperty("--sheet-action-font", `${s.sheetActionFontPx}px`);
  root.style.setProperty("--sheet-badge-font", `${s.sheetBadgeFontPx}px`);
}

/** Allinea le variabili CSS della mappa web ai token del viewport corrente. */
export function applyMapUiScale(root: HTMLElement = document.documentElement): void {
  applyScaleTokens(root, getMapUiScale());
}
