#!/usr/bin/env node
import {
  distanceKm,
  geocodeEventPlace,
  resolveMapMarkerCoordinates,
  assessEventLocation,
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

const castelCurly = "Castel Sant\u2019elia";
const castelPlace = geocodeEventPlace({
  comune: castelCurly,
  title: "Festa della Birra",
  venue: null,
});
if (castelPlace.comuneKey !== "castel sant'elia") {
  errors.push(`Castel Sant'Elia (apostrofo tipografico) atteso, ottenuto: ${castelPlace.comuneKey}`);
}

const castelPin = assessEventLocation({
  lat: viterbo.lat,
  lng: viterbo.lng,
  comune: castelCurly,
  city: null,
  title: "Festa della Birra",
  venue: null,
  location: null,
});
const distCastel = distanceKm(castelPin.lat, castelPin.lng, viterbo.lat, viterbo.lng);
if (distCastel < 8) {
  errors.push(`Festa della Birra a Castel S. Elia non deve restare su Viterbo (${distCastel.toFixed(1)} km)`);
}

if (errors.length) {
  console.error("verify-geocoding FAILED\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

console.log(
  `verify-geocoding OK — Civitella ~${distAfter.toFixed(1)} km, Castel Sant'Elia ~${distCastel.toFixed(1)} km da Viterbo`,
);
