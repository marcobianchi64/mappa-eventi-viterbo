#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  buildMapMarkerPlacements,
  findFestivalMapGroups,
  getFestivalAppointmentLabel,
  inferFestivalUmbrellaKey,
  MIN_FESTIVAL_MAP_GROUP_SIZE,
} from "@atlas/core";

const montefiascone = { lat: 42.5379839, lng: 12.0363877, comune: "Montefiascone" };
const programUrl = "https://example.com/fiera-del-vino-2026";

function fieraEvent(i, day, titleSuffix, venueExtra = "") {
  return {
    date_event: `fiera-${i}`,
    title: `Fiera del Vino — ${titleSuffix}`,
    start_date: `2026-08-${String(day).padStart(2, "0")}T19:00:00.000Z`,
    end_date: null,
    verified: true,
    archived: false,
    ...montefiascone,
    venue: venueExtra || "Cantine e spazi della Fiera nel centro storico",
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

const umbrellaMixed = [
  {
    date_event: "mf-1",
    title: "In Cantina con Defuk – 1° appuntamento",
    description: "Serata con musica jazz e degustazione",
    start_date: "2026-08-01T19:00:00.000Z",
    end_date: null,
    verified: true,
    archived: false,
    ...montefiascone,
    venue: "Cantine della Fiera",
    category: "food",
    event_url: null,
    source_id: "src-manual-discovery",
  },
  {
    date_event: "mf-2",
    title: "In Cantina con Defuk – 2° appuntamento",
    start_date: "2026-08-02T19:00:00.000Z",
    end_date: null,
    verified: true,
    archived: false,
    ...montefiascone,
    venue: "Cantine della Fiera",
    category: "food",
    event_url: null,
    source_id: "src-manual-discovery",
  },
  {
    date_event: "mf-3",
    title: "Degustazione Rossi – 1° appuntamento",
    start_date: "2026-08-03T19:00:00.000Z",
    end_date: null,
    verified: true,
    archived: false,
    ...montefiascone,
    venue: "Piazza del Duomo, Fiera del Vino",
    category: "food",
    event_url: null,
    source_id: "src-manual-discovery",
  },
  {
    date_event: "mf-4",
    title: "Cena in vigna – serata 4",
    start_date: "2026-08-04T19:00:00.000Z",
    end_date: null,
    verified: true,
    archived: false,
    ...montefiascone,
    venue: "Spazi Fiera del Vino",
    category: "food",
    event_url: null,
    source_id: "src-manual-discovery",
  },
];

for (const event of umbrellaMixed) {
  assert.ok(inferFestivalUmbrellaKey(event), `atteso umbrella per ${event.title}`);
}

assert.equal(findFestivalMapGroups(umbrellaMixed).length, 1);
assert.equal(buildMapMarkerPlacements(umbrellaMixed).length, 1);
assert.equal(buildMapMarkerPlacements(umbrellaMixed)[0].festivalGroup?.label, "Fiera del Vino");

const label = getFestivalAppointmentLabel(umbrellaMixed[0]);
assert.ok(!/appuntament/i.test(label), `etichetta non deve contenere numerazione: ${label}`);
assert.ok(label.includes("jazz") || label.includes("In Cantina"), `etichetta leggibile: ${label}`);

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
  `verify-festival-group OK — soglia ${MIN_FESTIVAL_MAP_GROUP_SIZE}, Fiera del Vino 6→1 pin, umbrella Montefiascone 4→1 pin, Bolsenarte 3→3 pin`,
);
