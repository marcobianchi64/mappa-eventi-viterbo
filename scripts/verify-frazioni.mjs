#!/usr/bin/env node
import { distanceKm, geocodeEventPlace } from "@atlas/core";

const errors = [];
const viterboCenter = { lat: 42.4173794, lng: 12.1048541 };

const castel = geocodeEventPlace({
  comune: "Viterbo",
  title: "Sagra Castel S. Elia",
  venue: "Centro",
});
if (castel.comuneKey !== "castel sant'elia") {
  errors.push(`Castel S. Elia atteso, ottenuto: ${castel.comuneKey}`);
}
const distCastelViterbo = distanceKm(
  castel.lat,
  castel.lng,
  viterboCenter.lat,
  viterboCenter.lng,
);
if (distCastelViterbo < 8) {
  errors.push(`Castel Sant'Elia non deve cadere su Viterbo (${distCastelViterbo.toFixed(1)} km)`);
}

const bagnaia = geocodeEventPlace({
  comune: "Viterbo",
  venue: "Bagnaia",
  title: "Festa del Pellegrino",
});

if (bagnaia.localitaKey !== "bagnaia") {
  errors.push(`attesa frazione bagnaia, ottenuto: ${bagnaia.localitaKey}`);
}

const dist = distanceKm(bagnaia.lat, bagnaia.lng, viterboCenter.lat, viterboCenter.lng);
if (dist < 2) {
  errors.push(`Bagnaia troppo vicina al centro Viterbo (${dist.toFixed(2)} km)`);
}

const plainViterbo = geocodeEventPlace({ comune: "Viterbo", venue: "Piazza San Lorenzo" });
if (plainViterbo.localitaKey) {
  errors.push(`Piazza centro non deve essere frazione: ${plainViterbo.localitaKey}`);
}

if (errors.length) {
  console.error("verify-frazioni FAILED\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

console.log(`verify-frazioni OK — Bagnaia ~${dist.toFixed(1)} km dal centro Viterbo`);
