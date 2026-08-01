#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { isHttpUrl, type AtlasEvent } from "@atlas/core";
import { runCli } from "./cli-exit.js";
import { resolveEventImageFromUrlThrottled } from "./resolve-event-image.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.argv.includes("--dry-run");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 0;

if (!url || !serviceRoleKey) {
  console.error("Richiesti SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY in packages/collector/.env");
  process.exit(1);
}

runCli(async () => {
  const client = createClient(url, serviceRoleKey);
  const { data, error } = await client
    .from("events")
    .select("date_event,title,event_url,image_url,archived,verified")
    .eq("archived", false)
    .order("start_date", { ascending: true });
  if (error) throw new Error(error.message);

  const candidates = ((data ?? []) as AtlasEvent[]).filter(
    (e) => e.verified === true && isHttpUrl(e.event_url) && !isHttpUrl(e.image_url),
  );

  const toProcess = limit > 0 ? candidates.slice(0, limit) : candidates;
  console.log(`Eventi senza immagine ma con URL: ${candidates.length} (elaboro ${toProcess.length})`);

  let updated = 0;
  let failed = 0;

  for (const event of toProcess) {
    const pageUrl = event.event_url!.trim();
    process.stdout.write(`• ${event.title.slice(0, 56)}… `);
    const imageUrl = await resolveEventImageFromUrlThrottled(pageUrl, 350);
    if (!imageUrl) {
      failed += 1;
      console.log("nessuna immagine");
      continue;
    }
    if (dryRun) {
      updated += 1;
      console.log(`[dry-run] ${imageUrl}`);
      continue;
    }
    const { error: upErr } = await client
      .from("events")
      .update({ image_url: imageUrl })
      .eq("date_event", event.date_event);
    if (upErr) {
      failed += 1;
      console.log(`errore DB: ${upErr.message}`);
      continue;
    }
    updated += 1;
    console.log("ok");
  }

  console.log(`\nCompletato: ${updated} aggiornati, ${failed} senza immagine o errore.`);
});
