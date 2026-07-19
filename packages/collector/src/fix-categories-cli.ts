#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { getCategoryMeta, resolveEventCategory, type AtlasEvent } from "@atlas/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.argv.includes("--dry-run");
const allCategories = process.argv.includes("--all");

if (!url || !serviceRoleKey) {
  console.error("Richiesti SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY in packages/collector/.env");
  process.exit(1);
}

const client = createClient(url, serviceRoleKey);

const { data, error } = await client.from("events").select("*").eq("archived", false);
if (error) {
  console.error(error.message);
  process.exit(1);
}

const events = (data ?? []) as AtlasEvent[];
const candidates = events.filter((event) => allCategories || event.category === "other");

let updated = 0;
let unchanged = 0;

for (const event of candidates) {
  const inferred = resolveEventCategory(event.category, event.title, [
    event.description ?? "",
    event.venue ?? "",
  ]);
  if (inferred === event.category) {
    unchanged += 1;
    continue;
  }

  const from = getCategoryMeta(event.category).label;
  const to = getCategoryMeta(inferred).label;
  console.log(`${dryRun ? "Aggiornerei" : "Aggiorno"}: ${event.title}`);
  console.log(`  ${from} → ${to} | ID ${event.date_event}`);

  if (!dryRun) {
    const { error: updateError } = await client
      .from("events")
      .update({ category: inferred })
      .eq("date_event", event.date_event);
    if (updateError) console.error(`  Errore: ${updateError.message}`);
    else updated += 1;
  } else {
    updated += 1;
  }
}

console.log(
  `\n${dryRun ? "Dry-run" : "Completato"}: ${updated} aggiornati, ${unchanged} invariati su ${candidates.length} analizzati.`,
);
