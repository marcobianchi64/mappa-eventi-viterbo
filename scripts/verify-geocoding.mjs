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

const legacyLabelOnly = resolveMapMarkerCoordinates({
  lat: viterbo.lat,
  lng: viterbo.lng,
  comune: "Civitella D'agliano",
  city: null,
  title: "Traindeville in concerto",
  venue: "Cassero della Torre dei Monaldeschi",
  location: null,
});

if (!legacyLabelOnly.adjusted) {
  errors.push(`pin con comune Civitella su Viterbo deve essere corretto, got ${JSON.stringify(legacyLabelOnly)}`);
}
const distAfter = distanceKm(legacyLabelOnly.lat, legacyLabelOnly.lng, viterbo.lat, viterbo.lng);
if (distAfter < 8) {
  errors.push(`dopo allineamento Civitella non deve restare su Viterbo (${distAfter.toFixed(1)} km)`);
}

if (errors.length) {
  console.error("verify-geocoding FAILED\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

console.log(`verify-geocoding OK — Civitella spostata ~${distAfter.toFixed(1)} km da centro Viterbo`);
