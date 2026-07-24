#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  findAllDuplicateClusters,
  isRegistryInPubblicazione,
  titleFingerprint,
  type AtlasEvent,
} from "@atlas/core";
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

  const { data, error } = await client
    .from("events")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const all = (data ?? []) as AtlasEvent[];
  const active = all.filter(isRegistryInPubblicazione);
  const clusters = findAllDuplicateClusters(active);

  if (clusters.length === 0) {
    console.log("Nessun duplicato da archiviare.");
    console.log("");
    console.log("Diagnostica rapida (titoli con «immagini» o «sagra»):");
    for (const event of active) {
      const t = event.title.toLowerCase();
      if (!t.includes("immagini") && !t.includes("sagra")) continue;
      console.log(`• ${event.title}`);
      console.log(
        `  ${event.lat},${event.lng} | fp:${titleFingerprint(event.title)} | ID ${event.date_event}`,
      );
    }
    return;
  }

  let archived = 0;

  for (const cluster of clusters) {
    const sorted = [...cluster].sort((a, b) => {
      const score = (e: AtlasEvent) =>
        (e.end_date ? 4 : 0) +
        (e.event_url ? 2 : 0) +
        (e.venue ? 1 : 0) +
        (e.description ? 1 : 0);
      const scoreDiff = score(b) - score(a);
      if (scoreDiff !== 0) return scoreDiff;
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
        if (updateError) throw new Error(updateError.message);
        archived += 1;
      } else {
        archived += 1;
      }
    }
  }

  if (dryRun) {
    console.log(`\nDry-run: ${archived} eventi verrebbero archiviati. Esegui senza --dry-run per applicare.`);
  } else {
    console.log(`\nCompletato: ${archived} duplicati archiviati.`);
    console.log("Ricarica la mappa (Ctrl+F5) e riesegui npm run report:duplicates");
  }
});
