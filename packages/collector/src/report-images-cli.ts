#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  DEFAULT_DATE_RANGE,
  isHttpUrl,
  isEventVisibleInRange,
  isRegistryInPubblicazione,
  type AtlasEvent,
} from "@atlas/core";
import { needsEventImageEnrichment } from "./enrich-event-images.js";
import { isReachableImageUrl } from "./image-url.js";
import { runCli } from "./cli-exit.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Richiesti SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY in packages/collector/.env");
  process.exit(1);
}

function pct(part: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
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
  const visible = published.filter((e) => isEventVisibleInRange(e, DEFAULT_DATE_RANGE));
  const withImage = published.filter((e) => isHttpUrl(e.image_url));
  const visibleWithImage = visible.filter((e) => isHttpUrl(e.image_url));
  const withoutEventUrl = visible.filter((e) => !isHttpUrl(e.event_url));
  const enrichable = published.filter(needsEventImageEnrichment);
  const visibleEnrichable = visible.filter(needsEventImageEnrichment);

  console.log("=== Locandine eventi ===\n");
  console.log(`In pubblicazione (totale):     ${published.length}`);
  console.log(`  con image_url nel DB:        ${withImage.length} (${pct(withImage.length, published.length)})`);
  console.log(`  arricchibili (manca URL img): ${enrichable.length}`);
  console.log(`  senza pagina ufficiale:      ${published.filter((e) => !isHttpUrl(e.event_url)).length}`);
  console.log("");
  console.log(`Visibili in app (prossimi ${DEFAULT_DATE_RANGE} giorni): ${visible.length}`);
  console.log(`  con image_url nel DB:        ${visibleWithImage.length} (${pct(visibleWithImage.length, visible.length)})`);
  console.log(`  ancora senza locandina:      ${visibleEnrichable.length}`);
  console.log(`  senza event_url (no auto):   ${withoutEventUrl.length}`);

  if (visibleWithImage.length > 0) {
    console.log("\n→ Verifica URL raggiungibili (campione fino a 12)…");
    let ok = 0;
    let broken = 0;
    for (const event of visibleWithImage.slice(0, 12)) {
      const reachable = await isReachableImageUrl(event.image_url!);
      if (reachable) ok += 1;
      else {
        broken += 1;
        console.log(`  ✗ ${event.title.slice(0, 48)}…`);
      }
    }
    console.log(`  Campione: ${ok} ok, ${broken} non raggiungibili`);
    if (broken > 0) {
      console.log("\n→ Prova: npm run fix:images -- --repair");
    }
  }

  if (enrichable.length > 0) {
    console.log("\n→ Backfill mancanti: npm run fix:images");
  } else if (visibleWithImage.length < visible.length * 0.5 && withoutEventUrl.length > 0) {
    console.log(
      "\nNota: molti eventi visibili non hanno pagina ufficiale (event_url).",
    );
    console.log("Senza URL non è possibile scaricare la locandina in automatico.");
  } else if (visibleWithImage.length >= visible.length * 0.8) {
    console.log("\nCopertura buona nel DB. Se in browser vedi meno foto, fai Ctrl+Shift+R.");
  }
});
