import {
  ATLAS_UI_SCALE_CONTRACT_VERSION,
  applyMapUiScale,
  getMapUiScale,
  type MapUiScaleTokens,
} from "./map-ui-scale.js";

/** Genera CSS con pixel espliciti e !important — non dipende dalla cascata variabili. */
export function buildAtlasTypographyLockCss(s: MapUiScaleTokens): string {
  return `
html { font-size: ${s.baseFontPx}px !important; }
body {
  font-size: ${s.baseFontPx}px !important;
  line-height: 1.45 !important;
}
.topbar .brand-pill,
.topbar .chip {
  font-size: ${s.chipFontPx}px !important;
  line-height: 1.35 !important;
}
.dock-btn,
.btn,
.filter-option,
.close-sheet,
.mobile-actions .btn {
  font-size: ${s.dockBtnFontPx}px !important;
  line-height: 1.35 !important;
}
.dock-flyout,
.dock-flyout-lead,
.bottom-sheet,
.filter-panel,
.programs-panel {
  font-size: ${s.baseFontPx}px !important;
}
.dock-flyout h2,
.bottom-sheet h2 {
  font-size: ${s.sheetTitleFontPx}px !important;
  line-height: 1.2 !important;
}
.dock-flyout label,
.bottom-sheet label,
.filter-panel h3,
.programs-panel h3 {
  font-size: ${s.panelLabelFontPx}px !important;
}
.dock-flyout input,
.dock-flyout select,
.dock-flyout textarea,
.bottom-sheet input,
.bottom-sheet select,
.bottom-sheet textarea,
.search-box input {
  font-size: ${s.panelInputFontPx}px !important;
}
.hint,
.status,
.search-note,
.legend,
.program-item span {
  font-size: ${s.legendFontPx}px !important;
}
.program-item strong {
  font-size: ${s.panelLabelFontPx}px !important;
}
.stable-event-sheet .stable-event-title {
  font-size: ${s.sheetTitleFontPx}px !important;
  line-height: 1.15 !important;
}
.stable-event-sheet .stable-event-facts,
.stable-event-sheet .stable-event-section p {
  font-size: ${s.sheetBodyFontPx}px !important;
}
.stable-event-sheet .stable-event-section h3 {
  font-size: ${s.sheetSectionHeadingFontPx}px !important;
}
.stable-event-sheet .stable-event-badge {
  font-size: ${s.sheetBadgeFontPx}px !important;
}
.stable-event-sheet .stable-event-action {
  font-size: ${s.sheetActionFontPx}px !important;
}
.stable-event-sheet .stable-event-action span {
  font-size: ${s.sheetActionIconFontPx}px !important;
}
.stable-toast {
  font-size: ${s.sheetBodyFontPx}px !important;
}
.leaflet-tooltip.atlas-event-tooltip {
  font-size: ${s.tooltipFontPx}px !important;
}
.leaflet-tooltip.atlas-event-tooltip strong,
.leaflet-tooltip.atlas-event-tooltip .event-preview strong {
  font-size: ${s.tooltipTitleFontPx}px !important;
}
.leaflet-tooltip.atlas-event-tooltip .event-preview-date {
  font-size: ${s.tooltipDateFontPx}px !important;
  font-weight: 700 !important;
}
.leaflet-tooltip.atlas-event-tooltip span:not(.event-preview-date),
.leaflet-tooltip.atlas-event-tooltip .event-preview span:not(.event-preview-date) {
  font-size: ${s.tooltipMetaFontPx}px !important;
}
`.trim();
}

/**
 * Applica variabili CSS + blocco tipografico !important (web).
 * Risolve override di Leaflet, button { font: inherit } e chip troppo piccoli.
 */
export function injectAtlasTypography(doc: Document = document): void {
  applyMapUiScale(doc.documentElement);
  const s = getMapUiScale();
  let el = doc.getElementById("atlas-typography-lock");
  if (!el) {
    el = doc.createElement("style");
    el.id = "atlas-typography-lock";
    doc.head.appendChild(el);
  }
  el.textContent = buildAtlasTypographyLockCss(s);

  const root = doc.documentElement;
  root.setAttribute("data-atlas-ui-contract", String(ATLAS_UI_SCALE_CONTRACT_VERSION));
  root.setAttribute("data-atlas-font-base", String(s.baseFontPx));
  doc.body?.classList.add("atlas-web");
}
