#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { compareMapRegistry, formatCompareReport } from "./compare-map-registry.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });
config({ path: resolve(__dirname, "../../../apps/web/.env") });

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey =
  process.env.SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY;
const daysArg = process.argv.find((a) => a.startsWith("--days="));
const rangeDays = (daysArg?.split("=")[1] ?? "60") as "60" | "30" | "15";
const outArg = process.argv.find((a) => a.startsWith("--out="));
const outPath = outArg?.split("=")[1];

if (!url || !serviceRoleKey) {
  console.error("Variabili richieste in packages/collector/.env:");
  console.error("  SUPABASE_URL (o VITE_SUPABASE_URL)");
  console.error("  SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (!anonKey) {
  console.warn("Attenzione: anon key non trovata — aggiungi VITE_SUPABASE_ANON_KEY in apps/web/.env");
}

compareMapRegistry({ supabaseUrl: url, serviceRoleKey, anonKey, rangeDays })
  .then((report) => {
    const text = formatCompareReport(report);
    console.log(text);
    if (outPath) {
      writeFileSync(outPath, text, "utf8");
      console.log(`\nReport salvato in: ${outPath}`);
    }
  })
  .catch((error) => {
    console.error("Errore:", error);
    process.exit(1);
  });
