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

const vitorchiano = { lat: 42.4664074, lng: 12.1734444 };
function cavatello(dayStart, dayEndStart, endDay) {
  return {
    date_event: `cavatello-${dayStart}`,
    title: "Sagra del Cavatello",
    start_date: `2026-08-${String(dayStart).padStart(2, "0")}T17:00:00.000Z`,
    end_date: `2026-08-${String(endDay).padStart(2, "0")}T23:00:00.000Z`,
    verified: true,
    archived: false,
    comune: "Vitorchiano",
    city: "Vitorchiano",
    venue: "Centro storico, Piazza Roma",
    lat: vitorchiano.lat,
    lng: vitorchiano.lng,
    category: "food",
    source_id: "src-manual-discovery",
  };
}

const cavA = cavatello(2, 2, 4);
const cavB = cavatello(3, 3, 5);
assert.equal(eventsAreMapDuplicates(cavA, cavB), true, "Sagra Cavatello reimportata");
assert.equal(dedupeEventsForMap([cavA, cavB]).length, 1);

const cavLong = {
  ...cavatello(31, 31, 3),
  title: "Sagra del Cavatello Vitorchiano Centro Storico",
  start_date: "2026-07-31T19:00:00.000Z",
  end_date: "2026-08-03T19:00:00.000Z",
};
const cavShort = {
  ...cavatello(2, 2, 4),
  title: "Sagra del Cavatello - Vitorchiano",
  start_date: "2026-08-02T19:00:00.000Z",
  end_date: "2026-08-04T19:00:00.000Z",
  lat: 42.42,
  lng: 12.104,
};
assert.equal(
  eventsAreMapDuplicates(cavLong, cavShort),
  true,
  "titoli scraping diversi, stessa sagra",
);
assert.equal(
  buildMapMarkerPlacements([cavLong, cavShort]).length,
  1,
  "dedupe dopo allineamento coordinate",
);

console.log("verify-map-dedupe: OK");
