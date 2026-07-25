#!/usr/bin/env node
import {
  distanceKm,
  geocodeEventPlace,
  resolveMapMarkerCoordinates,
  VITERBO_PROVINCE_CENTER,
} from "@atlas/core";

const errors = [];
const viterbo = VITERBO_PROVINCE_CENTER;

const civitellaPlace = geocodeEventPlace({
  comune: "Viterbo",
  title: "Traindeville in concerto",
  venue: "Cassero della Torre dei Monaldeschi",
  city: "Civitella d'Agliano",
});
if (civitellaPlace.comuneKey !== "civitella d'agliano") {
  errors.push(`Civitella attesa, ottenuto: ${civitellaPlace.comuneKey}`);
}

const legacyPin = resolveMapMarkerCoordinates({
  lat: viterbo.lat,
  lng: viterbo.lng,
  comune: "Viterbo",
  city: "Civitella d'Agliano",
  title: "Traindeville in concerto",
  venue: "Cassero della Torre dei Monaldeschi",
  location: null,
});
if (!legacyPin.adjusted || legacyPin.reason !== "viterbo-fallback") {
  errors.push(`pin legacy Viterbo deve essere corretto, got ${JSON.stringify(legacyPin)}`);
}
const distAfter = distanceKm(legacyPin.lat, legacyPin.lng, viterbo.lat, viterbo.lng);
if (distAfter < 8) {
  errors.push(`dopo allineamento Civitella non deve restare su Viterbo (${distAfter.toFixed(1)} km)`);
}

if (errors.length) {
  console.error("verify-geocoding FAILED\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

console.log(`verify-geocoding OK — Civitella spostata ~${distAfter.toFixed(1)} km da centro Viterbo`);
