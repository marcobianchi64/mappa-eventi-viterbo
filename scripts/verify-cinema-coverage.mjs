#!/usr/bin/env node
import {
  ATLAS_CINEMA_PLACES_VT,
  checkCinemaCoverage,
  mergeCinemaVenuesWithRegistry,
} from "@atlas/core";

const venues = [
  { cinema: "Arena Marconi", town: "Bolsena", films: [{ title: "A", url: "", times: ["21:00"] }] },
  { cinema: "Multisala Moderno", town: "Bolsena", films: [] },
];

const expectedCount = ATLAS_CINEMA_PLACES_VT.filter((p) => p.status !== "closed").length;
const manualCensus = ATLAS_CINEMA_PLACES_VT.filter((place) => place.status === "unknown");
if (manualCensus.length !== 14) {
  throw new Error(`Attese 14 sale nel censimento anagrafico, trovate ${manualCensus.length}`);
}
const declaredScreens = manualCensus.reduce((sum, place) => sum + (place.screenCount ?? 0), 0);
if (declaredScreens !== 25) {
  throw new Error(`Attesi 25 schermi nel censimento anagrafico, trovati ${declaredScreens}`);
}
const merged = mergeCinemaVenuesWithRegistry(venues);
if (merged.length !== expectedCount) {
  throw new Error(`Attese ${expectedCount} sale nel merge, trovate ${merged.length}`);
}
if (merged[0]?.cinema !== "Olimpya" || merged[0]?.town !== "Acquapendente") {
  throw new Error("Ordinamento atteso per comune/nome, prima sala Olimpya ad Acquapendente");
}
if (merged.some((venue) => venue.cinema === "The Space Cinema")) {
  throw new Error("Un record cinema chiuso o errato non deve comparire nel pubblico");
}

const report = checkCinemaCoverage(venues);
if (report.found !== 2) {
  throw new Error(`Attese 2 sale trovate nel coverage grezzo, trovate ${report.found}`);
}

console.log("✓ verify-cinema-coverage OK", {
  merged: merged.map((v) => ({ name: v.cinema, films: v.films.length })),
});
