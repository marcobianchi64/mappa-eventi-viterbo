#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  getCategoryMeta,
  getDisplayCategory,
  getEventDisplayTitle,
  inferEventCategory,
  refineEventTitle,
  type AtlasEvent,
} from "@atlas/core";
import { runCli } from "./cli-exit.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");

if (!url || !serviceRoleKey) {
  console.error("Richiesti SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY in packages/collector/.env");
  process.exit(1);
}

runCli(async () => {
  const client = createClient(url, serviceRoleKey);

  const { data, error } = await client.from("events").select("*").eq("archived", false);
  if (error) throw new Error(error.message);

  const events = (data ?? []) as AtlasEvent[];
  let updated = 0;
  let unchanged = 0;

  for (const event of events) {
    const stored = (event.category ?? "other").trim().toLowerCase();
    const inferred = inferEventCategory(
      [event.title, event.description, event.venue, event.comune, event.city].filter(Boolean).join(" "),
      [],
    );
    const display = getDisplayCategory(event);

    const shouldUpdate =
      force ? display !== event.category : stored === "other" || stored === "altro" || stored === "altri" || stored === "";

    if (!shouldUpdate || inferred === "other" || display === event.category) {
      unchanged += 1;
      continue;
    }

    const from = getCategoryMeta(event.category).label;
    const to = getCategoryMeta(display).label;
    console.log(`${dryRun ? "Aggiornerei" : "Aggiorno"}: ${getEventDisplayTitle(event)}`);
    console.log(`  ${from} → ${to} | ID ${event.date_event}`);

    if (!dryRun) {
      const { error: updateError } = await client
        .from("events")
        .update({ category: display })
        .eq("date_event", event.date_event);
      if (updateError) throw new Error(updateError.message);
      updated += 1;
    } else {
      updated += 1;
    }
  }

  console.log(`\n${dryRun ? "Dry-run" : "Completato"}: ${updated} categorie aggiornate, ${unchanged} invariati.`);
});
