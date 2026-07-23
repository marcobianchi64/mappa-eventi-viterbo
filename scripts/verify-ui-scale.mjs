#!/usr/bin/env node
/**
 * Verifica che pin Leaflet e token CSS restino allineati (unica fonte: MAP_UI_SCALE_*).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  MAP_UI_SCALE_DESKTOP,
  MAP_UI_SCALE_MOBILE,
  getMapMarkerIconLayout,
} from "@atlas/core";

const MIN_TOUCH_PX = 48;
const MIN_BODY_PX = 16;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mapService = readFileSync(
  join(root, "apps/web/src/map/map-service.ts"),
  "utf8",
);

const errors = [];

if (!mapService.includes("getMapMarkerIconLayout")) {
  errors.push("map-service.ts deve usare getMapMarkerIconLayout() invece di dimensioni hardcoded");
}

if (!mapService.includes("getMapUiScale")) {
  errors.push("map-service.ts deve usare getMapUiScale() per dimensioni pin responsive");
}

if (mapService.match(/iconSize:\s*\[\d+/)) {
  errors.push("map-service.ts contiene ancora iconSize hardcoded");
}

for (const [label, scale] of [
  ["desktop", MAP_UI_SCALE_DESKTOP],
  ["mobile", MAP_UI_SCALE_MOBILE],
]) {
  if (scale.markerSizePx < MIN_TOUCH_PX) {
    errors.push(`${label}: pin ${scale.markerSizePx}px sotto minimo touch ${MIN_TOUCH_PX}px`);
  }
  if (scale.baseFontPx < MIN_BODY_PX) {
    errors.push(`${label}: font base ${scale.baseFontPx}px sotto minimo ${MIN_BODY_PX}px`);
  }
  const layout = getMapMarkerIconLayout(scale.markerSizePx);
  if (layout.iconSize[0] !== scale.markerSizePx) {
    errors.push(`${label}: iconSize (${layout.iconSize[0]}) ≠ markerSizePx (${scale.markerSizePx})`);
  }
}

const mainTs = readFileSync(join(root, "apps/web/src/main.ts"), "utf8");
if (!mainTs.includes("applyMapUiScale")) {
  errors.push("main.ts deve chiamare applyMapUiScale() all'avvio");
}

const appTs = readFileSync(join(root, "apps/web/src/app.ts"), "utf8");
if (!appTs.includes("applyMapUiScale")) {
  errors.push("app.ts deve richiamare applyMapUiScale() al resize");
}

if (errors.length) {
  console.error("verify:ui-scale FAILED\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

console.log(
  `verify:ui-scale OK — desktop pin ${MAP_UI_SCALE_DESKTOP.markerSizePx}px, mobile pin ${MAP_UI_SCALE_MOBILE.markerSizePx}px, testo ${MAP_UI_SCALE_DESKTOP.baseFontPx}px`,
);
