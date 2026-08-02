#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { isHttpUrl, isRegistryInPubblicazione, type AtlasEvent } from "@atlas/core";
import { needsEventImageEnrichment } from "./enrich-event-images.js";
import { runCli } from "./cli-exit.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Richiesti SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY in packages/collector/.env");
  process.exit(1);
}

runCli(async () => {
  const client = createClient(url, serviceRoleKey);
  const { data, error } = await client
    .from("events")
    .select("date_event,title,event_url,image_url,archived,verified,start_date,end_date")
    .eq("archived", false)
    .eq("verified", true);

  if (error) throw new Error(error.message);

  const events = (data ?? []) as AtlasEvent[];
  const published = events.filter(isRegistryInPubblicazione);
  const withImage = published.filter((e) => isHttpUrl(e.image_url));
  const candidates = published.filter(needsEventImageEnrichment);

  console.log("=== Locandine eventi in pubblicazione ===");
  console.log(`In pubblicazione: ${published.length}`);
  console.log(`Con image_url:  ${withImage.length}`);
  console.log(`Senza locandina (arricchibili): ${candidates.length}`);

  if (candidates.length > 0) {
    console.log("\nEsempi senza locandina:");
    for (const e of candidates.slice(0, 8)) {
      console.log(`  • ${e.title.slice(0, 52)}…`);
      console.log(`    ${e.event_url}`);
    }
    console.log("\n→ Esegui: npm run fix:images");
    console.log("  (oppure npm run collect per sync + arricchimento automatico)");
  } else if (withImage.length === 0 && published.length > 0) {
    console.log("\nNessun evento ha image_url. Avvia il backfill con npm run fix:images");
  } else {
    console.log("\nCopertura ok.");
  }
});
