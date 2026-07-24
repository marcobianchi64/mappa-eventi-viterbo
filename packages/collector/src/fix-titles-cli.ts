#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { getEventDisplayTitle, refineEventTitle, type AtlasEvent } from "@atlas/core";
import { runCli } from "./cli-exit.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.argv.includes("--dry-run");

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

  for (const event of events) {
    const refined = refineEventTitle(event);
    if (!refined || refined === event.title) continue;

    console.log(`${dryRun ? "Aggiornerei titolo" : "Aggiorno titolo"}:`);
    console.log(`  Da: ${event.title}`);
    console.log(`  A:  ${refined}`);
    console.log(`  ID: ${event.date_event}`);

    if (!dryRun) {
      const { error: updateError } = await client
        .from("events")
        .update({ title: refined })
        .eq("date_event", event.date_event);
      if (updateError) throw new Error(updateError.message);
    }
    updated += 1;
  }

  console.log(`\n${dryRun ? "Dry-run" : "Completato"}: ${updated} titoli aggiornati.`);
});
