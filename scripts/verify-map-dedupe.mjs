/**
 * Verifica che eventi distinti nello stesso comune non vengano eliminati dalla dedupe mappa.
 */
import assert from "node:assert/strict";
import {
  buildMapMarkerPlacements,
  dedupeEventsForMap,
  eventsAreMapDuplicates,
} from "../packages/core/dist/index.js";

const bolsena = { lat: 42.364, lng: 11.986 };

function fakeEvent(i, title, day) {
  return {
    date_event: `test-${i}`,
    title,
    start_date: `2026-07-${String(day).padStart(2, "0")}T19:00:00.000Z`,
    end_date: null,
    verified: true,
    archived: false,
    comune: "Bolsena",
    city: "Bolsena",
    lat: bolsena.lat,
    lng: bolsena.lng,
    category: "music",
    source_id: "src-manual-discovery",
  };
}

const concerts = [
  fakeEvent(1, "Bolsenarte — Concerto jazz con Mario Rossi", 5),
  fakeEvent(2, "Bolsenarte — Serata rock con The Lakes", 6),
  fakeEvent(3, "Bolsenarte — Coro polifonico", 12),
  fakeEvent(4, "Sagra del lago — stand e musica", 20),
];

for (let i = 0; i < concerts.length; i++) {
  for (let j = i + 1; j < concerts.length; j++) {
    assert.equal(
      eventsAreMapDuplicates(concerts[i], concerts[j]),
      false,
      `non devono essere duplicati: ${concerts[i].title} vs ${concerts[j].title}`,
    );
  }
}

assert.equal(dedupeEventsForMap(concerts).length, 4);
assert.equal(buildMapMarkerPlacements(concerts).length, 4);

const twin = fakeEvent(5, "Sagra del lago — stand e musica", 20);
assert.equal(eventsAreMapDuplicates(concerts[3], twin), true);
assert.equal(dedupeEventsForMap([...concerts, twin]).length, 4);

console.log("verify-map-dedupe: OK");
