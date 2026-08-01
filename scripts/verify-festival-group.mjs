#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  buildMapMarkerPlacements,
  findFestivalMapGroups,
  MIN_FESTIVAL_MAP_GROUP_SIZE,
} from "@atlas/core";

const montefiascone = { lat: 42.5379839, lng: 12.0363877, comune: "Montefiascone" };
const programUrl = "https://example.com/fiera-del-vino-2026";

function fieraEvent(i, day, titleSuffix) {
  return {
    date_event: `fiera-${i}`,
    title: `Fiera del Vino — ${titleSuffix}`,
    start_date: `2026-08-${String(day).padStart(2, "0")}T19:00:00.000Z`,
    end_date: null,
    verified: true,
    archived: false,
    ...montefiascone,
    category: "food",
    event_url: programUrl,
    source_id: "src-manual-discovery",
  };
}

const fieraEvents = Array.from({ length: 6 }, (_, i) =>
  fieraEvent(i + 1, 10 + i, `Serata ${i + 1}`),
);

assert.equal(findFestivalMapGroups(fieraEvents).length, 1);
assert.equal(buildMapMarkerPlacements(fieraEvents).length, 1);
const group = buildMapMarkerPlacements(fieraEvents)[0];
assert.ok(group.festivalGroup);
assert.equal(group.festivalGroup.events.length, 6);
assert.equal(group.festivalGroup.label, "Fiera del Vino");

const bolsena = { lat: 42.364, lng: 11.986, comune: "Bolsena" };
const bolsenarteUrl = "https://visitbolsena.it/eventi/bolsenarte-2026/";
const bolsenarte = [5, 6, 12].map((day, i) => ({
  date_event: `bolsenarte-${i}`,
  title: `Bolsenarte — Concerto ${i + 1}`,
  start_date: `2026-07-${String(day).padStart(2, "0")}T19:00:00.000Z`,
  end_date: null,
  verified: true,
  archived: false,
  ...bolsena,
  category: "music",
  event_url: bolsenarteUrl,
  source_id: "src-manual-discovery",
}));

assert.equal(
  findFestivalMapGroups(bolsenarte).length,
  0,
  "meno di MIN_FESTIVAL_MAP_GROUP_SIZE non si raggruppa",
);
assert.equal(buildMapMarkerPlacements(bolsenarte).length, 3);

console.log(
  `verify-festival-group OK — soglia ${MIN_FESTIVAL_MAP_GROUP_SIZE}, Fiera del Vino 6→1 pin, Bolsenarte 3→3 pin`,
);
