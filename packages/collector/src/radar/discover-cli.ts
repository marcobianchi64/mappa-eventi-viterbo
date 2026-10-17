#!/usr/bin/env node
import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runRadarDiscover } from "./discover.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const territoryId = process.env.ATLAS_TERRITORY_ID ?? "IT-VT";

if (!url || !serviceRoleKey) {
  console.error("Variabili richieste: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const maxPages = Number(process.env.ATLAS_RADAR_MAX_PAGES ?? "8");

console.log(`Atlas Radar — discovery v1 (${territoryId})`);

runRadarDiscover({
  supabaseUrl: url,
  serviceRoleKey,
  territoryId,
  maxPages: Number.isFinite(maxPages) ? maxPages : 8,
})
  .then((result) => {
    console.log("\n=== Radar discovery ===");
    console.log(`Run: ${result.runId}`);
    console.log(`Pagine: ${result.pagesFetched}, link valutati: ${result.linksScored}, candidati upsert: ${result.candidatesUpserted}`);
    if (result.errors.length) {
      console.warn("Avvisi:", result.errors.slice(0, 10).join(" | "));
    }
  })
  .catch((error) => {
    console.error("Errore:", error);
    process.exit(1);
  });
