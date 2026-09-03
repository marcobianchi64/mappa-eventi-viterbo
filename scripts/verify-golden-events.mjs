#!/usr/bin/env node
/**
 * Regressioni su casi territorio VT (golden catalog).
 */
import assert from "node:assert/strict";
import {
  assessEventLocation,
  distanceKm,
  eventsAreMapDuplicates,
  geocodeEventPlace,
  GOLDEN_DEDUPE_PAIRS,
  GOLDEN_EVENT_CASES,
  GOLDEN_GEOCODE_CASES,
  VITERBO_PROVINCE_CENTER,
} from "../packages/core/dist/index.js";

const errors = [];

for (const golden of GOLDEN_EVENT_CASES) {
  const assessed = assessEventLocation(golden.event);

  if (golden.expect.allowDirections !== undefined) {
    if (assessed.allowDirections !== golden.expect.allowDirections) {
      errors.push(
        `${golden.id}: allowDirections atteso ${golden.expect.allowDirections}, got ${assessed.allowDirections}`,
      );
    }
  }

  if (golden.expect.confidence !== undefined) {
    if (assessed.confidence !== golden.expect.confidence) {
      errors.push(
        `${golden.id}: confidence atteso ${golden.expect.confidence}, got ${assessed.confidence}`,
      );
    }
  }

  if (golden.expect.minKmFromProvinceCenter !== undefined) {
    const km = distanceKm(
      assessed.lat,
      assessed.lng,
      VITERBO_PROVINCE_CENTER.lat,
      VITERBO_PROVINCE_CENTER.lng,
    );
    if (km < golden.expect.minKmFromProvinceCenter) {
      errors.push(
        `${golden.id}: distanza da centro provincia ${km.toFixed(1)} km < ${golden.expect.minKmFromProvinceCenter}`,
      );
    }
  }
}

for (const geo of GOLDEN_GEOCODE_CASES) {
  const place = geocodeEventPlace(geo.input);
  if (geo.expect.localitaKey && place.localitaKey !== geo.expect.localitaKey) {
    errors.push(`${geo.id}: localitaKey atteso ${geo.expect.localitaKey}, got ${place.localitaKey}`);
  }
  if (geo.expect.minKmFromProvinceCenter !== undefined) {
    const km = distanceKm(
      place.lat,
      place.lng,
      VITERBO_PROVINCE_CENTER.lat,
      VITERBO_PROVINCE_CENTER.lng,
    );
    if (km < geo.expect.minKmFromProvinceCenter) {
      errors.push(
        `${geo.id}: distanza da centro provincia ${km.toFixed(1)} km < ${geo.expect.minKmFromProvinceCenter}`,
      );
    }
  }
}

for (const pair of GOLDEN_DEDUPE_PAIRS) {
  const dup = eventsAreMapDuplicates(pair.a, pair.b);
  if (dup !== pair.shouldBeMapDuplicates) {
    errors.push(
      `${pair.id}: map duplicate atteso ${pair.shouldBeMapDuplicates}, got ${dup}`,
    );
  }
}

if (errors.length) {
  console.error("verify-golden-events FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

console.log(
  `verify-golden-events OK — ${GOLDEN_EVENT_CASES.length} casi luogo, ${GOLDEN_GEOCODE_CASES.length} geocode, ${GOLDEN_DEDUPE_PAIRS.length} coppie dedupe`,
);
