/** Scala UI mappa — unica fonte di verità per pin, tooltip e pannello. */
export const MAP_UI_SCALE = {
  markerSizePx: 56,
  markerBorderPx: 3,
  markerIconFontPx: 24,
  tooltipWidthPx: 360,
  tooltipMinWidthPx: 300,
  tooltipPaddingPx: 16,
  tooltipFontPx: 16,
  tooltipTitleFontPx: 18,
  panelWidthPx: 440,
  filterPanelWidthPx: 360,
  programsPanelWidthPx: 400,
  baseFontPx: 16,
} as const;

export type MapMarkerIconLayout = {
  iconSize: [number, number];
  iconAnchor: [number, number];
  popupAnchor: [number, number];
  tooltipAnchor: [number, number];
};

export function getMapMarkerIconLayout(
  markerSizePx: number = MAP_UI_SCALE.markerSizePx,
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

/** Allinea le variabili CSS della mappa web ai token condivisi. */
export function applyMapUiScale(root: HTMLElement = document.documentElement): void {
  const s = MAP_UI_SCALE;
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
}
