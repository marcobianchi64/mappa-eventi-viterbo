#!/usr/bin/env node
/**
 * Verifica che pin Leaflet e token CSS restino allineati (unica fonte: MAP_UI_SCALE).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { MAP_UI_SCALE, getMapMarkerIconLayout } from "@atlas/core";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mapService = readFileSync(
  join(root, "apps/web/src/map/map-service.ts"),
  "utf8",
);

const layout = getMapMarkerIconLayout();
const errors = [];

if (!mapService.includes("getMapMarkerIconLayout")) {
  errors.push("map-service.ts deve usare getMapMarkerIconLayout() invece di dimensioni hardcoded");
}

if (mapService.match(/iconSize:\s*\[\d+/)) {
  errors.push("map-service.ts contiene ancora iconSize hardcoded");
}

if (layout.iconSize[0] !== MAP_UI_SCALE.markerSizePx) {
  errors.push(
    `iconSize (${layout.iconSize[0]}) ≠ MAP_UI_SCALE.markerSizePx (${MAP_UI_SCALE.markerSizePx})`,
  );
}

const mainTs = readFileSync(join(root, "apps/web/src/main.ts"), "utf8");
if (!mainTs.includes("applyMapUiScale")) {
  errors.push("main.ts deve chiamare applyMapUiScale() all'avvio");
}

if (errors.length) {
  console.error("verify:ui-scale FAILED\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

console.log(
  `verify:ui-scale OK — pin ${MAP_UI_SCALE.markerSizePx}px, tooltip ${MAP_UI_SCALE.tooltipWidthPx}px, pannello ${MAP_UI_SCALE.panelWidthPx}px`,
);
