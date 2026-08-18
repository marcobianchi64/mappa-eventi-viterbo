#!/usr/bin/env node
import {
  distanceKm,
  geocodeEventPlace,
  resolveMapMarkerCoordinates,
  assessEventLocation,
  inferComuneFromText,
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

const bagnaiaPin = resolveMapMarkerCoordinates({
  lat: viterbo.lat,
  lng: viterbo.lng,
  comune: "Viterbo",
  city: null,
  title: "Evento a Bagnaia",
  venue: "Bagnaia",
  location: null,
});
if (!bagnaiaPin.adjusted) {
  errors.push(`Bagnaia con pin su Viterbo deve essere corretto, got ${JSON.stringify(bagnaiaPin)}`);
}
const distBagnaia = distanceKm(bagnaiaPin.lat, bagnaiaPin.lng, viterbo.lat, viterbo.lng);
if (distBagnaia < 2) {
  errors.push(`Bagnaia non deve restare sul centro Viterbo (${distBagnaia.toFixed(1)} km)`);
}

if (inferComuneFromText("Jacopo Mai – recital per pianoforte solo")) {
  errors.push(`«pianoforte» non deve essere letto come comune Orte`);
}

const jacopoPlace = geocodeEventPlace({
  title: "Jacopo Mai – recital per pianoforte solo",
  venue: "Molo del fiume Fiora, Montalto Marina",
  comune: null,
  city: null,
  location: null,
});
if (jacopoPlace.comuneKey !== "montalto di castro") {
  errors.push(`Jacopo Mai atteso Montalto di Castro, ottenuto: ${jacopoPlace.comuneKey}`);
}
if (jacopoPlace.localitaKey !== "montalto marina") {
  errors.push(`Jacopo Mai attesa località Montalto Marina, ottenuta: ${jacopoPlace.localitaKey}`);
}

const jacopoPin = assessEventLocation({
  lat: 42.4603148,
  lng: 12.3864259,
  title: "Jacopo Mai – recital per pianoforte solo",
  venue: "Molo del fiume Fiora, Montalto Marina",
  comune: null,
  city: null,
  location: null,
});
const distJacopoOrte = distanceKm(jacopoPin.lat, jacopoPin.lng, 42.4603148, 12.3864259);
if (distJacopoOrte < 15) {
  errors.push(`Jacopo Mai non deve restare su Orte (${distJacopoOrte.toFixed(1)} km dal pin errato)`);
}
const distJacopoMarina = distanceKm(jacopoPin.lat, jacopoPin.lng, jacopoPlace.lat, jacopoPlace.lng);
if (distJacopoMarina > 2) {
  errors.push(`Jacopo Mai deve essere geolocalizzato a Montalto Marina (${distJacopoMarina.toFixed(1)} km)`);
}

if (errors.length) {
  console.error("verify-geocoding FAILED\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

console.log(
  `verify-geocoding OK — Civitella ~${distAfter.toFixed(1)} km, Castel Sant'Elia ~${distCastel.toFixed(1)} km, Bagnaia ~${distBagnaia.toFixed(1)} km da Viterbo`,
);
