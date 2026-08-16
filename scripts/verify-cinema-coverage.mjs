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
const merged = mergeCinemaVenuesWithRegistry(venues);
if (merged.length !== expectedCount) {
  throw new Error(`Attese ${expectedCount} sale nel merge, trovate ${merged.length}`);
}
if (merged[0]?.cinema !== "Arena Marconi") {
  throw new Error("Ordinamento atteso per comune/nome, prima sala Bolsena Arena Marconi");
}
if (!merged.some((venue) => venue.cinema === "The Space Cinema" && venue.films.length === 0)) {
  throw new Error("The Space dovrebbe comparire senza film");
}

const report = checkCinemaCoverage(venues);
if (report.found !== 2) {
  throw new Error(`Attese 2 sale trovate nel coverage grezzo, trovate ${report.found}`);
}

console.log("✓ verify-cinema-coverage OK", {
  merged: merged.map((v) => ({ name: v.cinema, films: v.films.length })),
});
