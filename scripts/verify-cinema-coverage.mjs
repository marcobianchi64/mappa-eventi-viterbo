#!/usr/bin/env node
import { ATLAS_CINEMA_PLACES_VT, checkCinemaCoverage } from "@atlas/core";

const venues = [
  { cinema: "Arena Marconi", town: "Bolsena", films: [] },
  { cinema: "Multisala Moderno", town: "Bolsena", films: [] },
];

const report = checkCinemaCoverage(venues);
if (report.expected !== ATLAS_CINEMA_PLACES_VT.filter((p) => p.status !== "closed").length) {
  throw new Error("Conteggio atteso cinema non coerente col catalogo");
}
if (report.found !== 2) {
  throw new Error(`Attese 2 sale trovate, trovate ${report.found}`);
}
if (!report.missing.some((gap) => gap.placeId.includes("thespace"))) {
  throw new Error("The Space dovrebbe risultare mancante nel gap report");
}

console.log("✓ verify-cinema-coverage OK", {
  expected: report.expected,
  found: report.found,
  missing: report.missing.map((gap) => gap.placeName),
});
