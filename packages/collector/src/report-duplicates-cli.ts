#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  findDuplicateClusters,
  findMapPinClusters,
  isEventVisibleInRange,
  isRegistryInPubblicazione,
  type AtlasEvent,
} from "@atlas/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Richiesti SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY in packages/collector/.env");
  process.exit(1);
}

const client = createClient(url, serviceRoleKey);

const { data, error } = await client.from("events").select("*").order("start_date", { ascending: true });
if (error) {
  console.error(error.message);
  process.exit(1);
}

const all = (data ?? []) as AtlasEvent[];
const active = all.filter(isRegistryInPubblicazione);
const visible60 = active.filter((e) => isEventVisibleInRange(e, "60"));
const dbClusters = findDuplicateClusters(active);
const pinClusters = findMapPinClusters(visible60);

console.log(`=== Duplicati eventi attivi ===`);
console.log(`Eventi in pubblicazione: ${active.length}`);
console.log(`Visibili mappa (60g): ${visible60.length}`);
console.log(`Cluster duplicati DB: ${dbClusters.length}`);
console.log(`Cluster stesso pin mappa: ${pinClusters.length}`);
console.log(
  `Copie extra DB: ${dbClusters.reduce((sum, c) => sum + c.length - 1, 0)} | pin: ${pinClusters.reduce((sum, c) => sum + c.length - 1, 0)}`,
);
console.log("");

function printClusters(title: string, clusters: AtlasEvent[][]) {
  if (clusters.length === 0) {
    console.log(`${title}: (nessuno)`);
    return;
  }
  for (const [index, cluster] of clusters.entries()) {
    console.log(`--- ${title} ${index + 1} (${cluster.length} copie) ---`);
    for (const event of cluster) {
      const date = new Date(event.start_date).toLocaleDateString("it-IT");
      const end = event.end_date ? new Date(event.end_date).toLocaleDateString("it-IT") : "—";
      console.log(`• ${event.title}`);
      console.log(
        `  ${date} → ${end} | ${event.comune ?? event.city ?? "—"} | ${event.lat},${event.lng} | cat:${event.category} | ID ${event.date_event}`,
      );
    }
    console.log("");
  }
}

printClusters("Cluster DB", dbClusters);
printClusters("Cluster pin mappa", pinClusters);

if (dbClusters.length === 0 && pinClusters.length === 0) {
  console.log("Nessun duplicato rilevato.");
} else {
  console.log("Per archiviare le copie extra:");
  console.log("  npm run fix:duplicates -- --dry-run");
  console.log("  npm run fix:duplicates");
}
