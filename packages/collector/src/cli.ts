#!/usr/bin/env node
import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCollector } from "./index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sourceFilter = process.env.ATLAS_SOURCES?.split(",").map((s) => s.trim()).filter(Boolean);

if (!url || !serviceRoleKey) {
  console.error("Variabili richieste: SUPABASE_URL (o VITE_SUPABASE_URL) e SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

console.log("Atlas Collector — sincronizzazione fonti Viterbo (AUTO-1 + AUTO-2)");

runCollector({ supabaseUrl: url, serviceRoleKey, sourceIds: sourceFilter })
  .then((reports) => {
    console.log("\n=== Riepilogo ===");
    for (const r of reports) {
      console.log(`${r.name}: trovati ${r.found}, inseriti ${r.inserted}, aggiornati ${r.updated}`);
      if (r.errors.length) console.log(`  errori: ${r.errors.join(" | ")}`);
    }
  })
  .catch((error) => {
    console.error("Errore fatale:", error);
    process.exit(1);
  });
