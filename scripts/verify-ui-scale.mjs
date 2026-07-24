#!/usr/bin/env node
/**
 * Contratto UI Atlas — impedisce regressioni su pin, testo e tooltip.
 * Eseguire: npm run verify:ui-scale (anche in CI).
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  ATLAS_UI_MIN_BODY_FONT_PX,
  ATLAS_UI_MIN_TOUCH_PX,
  ATLAS_UI_SCALE_CONTRACT_VERSION,
  MAP_UI_SCALE_DESKTOP,
  MAP_UI_SCALE_MOBILE,
  getMapMarkerIconLayout,
} from "@atlas/core";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function read(relPath) {
  return readFileSync(join(root, relPath), "utf8");
}

function scanDir(relDir, exts, onFile) {
  const abs = join(root, relDir);
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const rel = join(relDir, entry.name);
    if (entry.isDirectory() && entry.name !== "dist" && entry.name !== "node_modules") {
      scanDir(rel, exts, onFile);
    } else if (entry.isFile() && exts.some((ext) => entry.name.endsWith(ext))) {
      onFile(rel, read(rel));
    }
  }
}

// --- Contratto numerico ---
for (const [label, scale] of [
  ["desktop", MAP_UI_SCALE_DESKTOP],
  ["mobile", MAP_UI_SCALE_MOBILE],
]) {
  if (scale.markerSizePx < ATLAS_UI_MIN_TOUCH_PX) {
    errors.push(`${label}: pin ${scale.markerSizePx}px < minimo ${ATLAS_UI_MIN_TOUCH_PX}px`);
  }
  if (scale.baseFontPx < ATLAS_UI_MIN_BODY_FONT_PX) {
    errors.push(`${label}: font ${scale.baseFontPx}px < minimo ${ATLAS_UI_MIN_BODY_FONT_PX}px`);
  }
  const layout = getMapMarkerIconLayout(scale.markerSizePx);
  if (layout.iconSize[0] !== scale.markerSizePx) {
    errors.push(`${label}: layout pin disallineato`);
  }
}

// --- File obbligatori ---
const mapUiScale = read("packages/core/src/map-ui-scale.ts");
if (!mapUiScale.includes(`ATLAS_UI_SCALE_CONTRACT_VERSION = ${ATLAS_UI_SCALE_CONTRACT_VERSION}`)) {
  errors.push("map-ui-scale.ts: versione contratto mancante o non allineata");
}

const sharedCss = read("packages/core/styles/atlas-map-ui.css");
if (!sharedCss.includes(".atlas-marker")) {
  errors.push("atlas-map-ui.css: stili pin condivisi mancanti");
}

// --- Web: usa API condivise ---
const mapService = read("apps/web/src/map/map-service.ts");
if (!mapService.includes("createAtlasMapMarkerIcon")) {
  errors.push("map-service.ts deve usare createAtlasMapMarkerIcon()");
}
if (mapService.match(/iconSize:\s*\[\d+/)) {
  errors.push("map-service.ts: iconSize hardcoded vietato");
}

const webMain = read("apps/web/src/main.ts");
if (!webMain.includes("injectAtlasTypography")) {
  errors.push("apps/web/main.ts deve chiamare injectAtlasTypography()");
}
if (!webMain.includes("atlas-map-ui.css")) {
  errors.push("apps/web deve importare packages/core/styles/atlas-map-ui.css");
}

const typographyLock = read("packages/core/src/atlas-typography-lock.ts");
if (!typographyLock.includes("!important")) {
  errors.push("atlas-typography-lock.ts deve forzare font-size con !important");
}

const webApp = read("apps/web/src/app.ts");
if (!webApp.includes("injectAtlasTypography")) {
  errors.push("apps/web/app.ts deve richiamare injectAtlasTypography()");
}

// --- Admin: stesso contratto ---
const adminMap = read("apps/admin/src/map/admin-map.ts");
if (!adminMap.includes("createAtlasMapMarkerIcon")) {
  errors.push("admin-map.ts deve usare createAtlasMapMarkerIcon()");
}
if (adminMap.match(/iconSize:\s*\[\d+/) || adminMap.match(/width:\s*28px/)) {
  errors.push("admin-map.ts: dimensioni pin hardcoded vietate");
}

const adminMain = read("apps/admin/src/main.ts");
if (!adminMain.includes("applyMapUiScale")) {
  errors.push("apps/admin/main.ts deve chiamare applyMapUiScale()");
}
if (!adminMain.includes("atlas-map-ui.css")) {
  errors.push("apps/admin deve importare packages/core/styles/atlas-map-ui.css");
}

// --- Vietato hardcodare pin/font mappa nei sorgenti app ---
const forbiddenInMapFiles = [
  /iconSize:\s*\[\s*(2[0-9]|3[0-9]|4[0-9])\s*,/,
  /width:\s*(2[0-9]|3[0-9])px.*height:\s*(2[0-9]|3[0-9])px/,
];

for (const relDir of ["apps/web/src/map", "apps/admin/src/map"]) {
  scanDir(relDir, [".ts"], (rel, content) => {
    for (const pattern of forbiddenInMapFiles) {
      if (pattern.test(content)) {
        errors.push(`${rel}: dimensione pin hardcoded (usa createAtlasMapMarkerIcon)`);
      }
    }
  });
}

if (errors.length) {
  console.error(
    `verify:ui-scale FAILED (contratto v${ATLAS_UI_SCALE_CONTRACT_VERSION})\n` +
      errors.map((e) => `  - ${e}`).join("\n"),
  );
  process.exit(1);
}

console.log(
  `verify:ui-scale OK — contratto v${ATLAS_UI_SCALE_CONTRACT_VERSION} · desktop ${MAP_UI_SCALE_DESKTOP.markerSizePx}px / mobile ${MAP_UI_SCALE_MOBILE.markerSizePx}px · testo ${MAP_UI_SCALE_DESKTOP.baseFontPx}px`,
);
