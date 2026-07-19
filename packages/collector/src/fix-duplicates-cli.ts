#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { findDuplicateClusters, isRegistryInPubblicazione, type AtlasEvent } from "@atlas/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.argv.includes("--dry-run");

if (!url || !serviceRoleKey) {
  console.error("Richiesti SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY in packages/collector/.env");
  process.exit(1);
}

const client = createClient(url, serviceRoleKey);

const { data, error } = await client.from("events").select("*").order("created_at", { ascending: true });
if (error) {
  console.error(error.message);
  process.exit(1);
}

const all = (data ?? []) as AtlasEvent[];
const active = all.filter(isRegistryInPubblicazione);
const clusters = findDuplicateClusters(active);

if (clusters.length === 0) {
  console.log("Nessun duplicato da archiviare.");
  process.exit(0);
}

let archived = 0;

for (const cluster of clusters) {
  const sorted = [...cluster].sort((a, b) => {
    const ca = new Date(a.created_at ?? 0).getTime();
    const cb = new Date(b.created_at ?? 0).getTime();
    return ca - cb;
  });
  const keep = sorted[0];
  const extras = sorted.slice(1);

  console.log(`Mantieni: ${keep.title} (${keep.date_event})`);
  for (const extra of extras) {
    console.log(`  ${dryRun ? "Archivierei" : "Archivio"}: ${extra.title} (${extra.date_event})`);
    if (!dryRun) {
      const { error: updateError } = await client
        .from("events")
        .update({ archived: true })
        .eq("date_event", extra.date_event);
      if (updateError) {
        console.error(`  Errore: ${updateError.message}`);
      } else {
        archived += 1;
      }
    } else {
      archived += 1;
    }
  }
}

if (dryRun) {
  console.log(`\nDry-run: ${archived} eventi verrebbero archiviati. Esegui senza --dry-run per applicare.`);
} else {
  console.log(`\nCompletato: ${archived} duplicati archiviati.`);
  console.log("Suggerimento: ricarica la mappa e riesegui npm run report:compare");
}
