import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  countDiscoveryDataRowsInPaste,
  eventsAreDiscoveryDuplicates,
  parseDiscoveryText,
  prepareDiscoveryPasteText,
} from "../packages/core/dist/index.js";

const fixture = resolve("fixtures/discovery-musica-2026-full.md");
let text;
try {
  text = readFileSync(fixture, "utf8");
} catch {
  text = readFileSync(resolve("fixtures/discovery-musica-2026.md"), "utf8");
}

const dataRows = countDiscoveryDataRowsInPaste(text);
const parsed = parseDiscoveryText(text);
const bolsena = parsed.filter((r) => (r.comune ?? "").toLowerCase().includes("bolsena"));

console.log("righe dati nel testo:", dataRows);
console.log("righe parser:", parsed.length);
console.log("Bolsena nel parser:", bolsena.length);

assert.equal(dataRows, parsed.length, "ogni riga dati deve essere parsata");
if (dataRows >= 25) {
  assert.ok(bolsena.length >= 10, `attesi >=10 Bolsena, trovati ${bolsena.length}`);
} else {
  console.log("(fixture ridotto: salva la tabella completa in fixtures/discovery-musica-2026-full.md per test 27 righe)");
}

const a = {
  title: "KHOROS",
  start_date: new Date("2026-07-29T19:00:00").toISOString(),
  end_date: null,
  comune: "Bolsena",
  city: "Bolsena",
  lat: 42.64,
  lng: 11.98,
  event_url: "https://visitbolsena.it/eventi/bolsenarte-2026/",
};
const b = {
  title: "L'Elisir d'amore",
  start_date: new Date("2026-07-25T19:00:00").toISOString(),
  end_date: null,
  comune: "Bolsena",
  city: "Bolsena",
  lat: 42.64,
  lng: 11.98,
  event_url: "https://visitbolsena.it/eventi/bolsenarte-2026/",
};
assert.equal(eventsAreDiscoveryDuplicates(a, b), false, "concerti Bolsenarte giorni diversi non sono duplicati");

assert.ok(!prepareDiscoveryPasteText(text + "\n[1]: https://x.com").includes("[1]:"));
console.log("verify-discovery-table: OK");
