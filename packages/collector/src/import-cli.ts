#!/usr/bin/env node
import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { importEventsFromCsv } from "./import-events.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const includePending = args.includes("--include-pending");
const registerSources = args.includes("--register-sources");
const filePath = args.find((a) => !a.startsWith("--"));

if (!url || !serviceRoleKey) {
  console.error("Variabili richieste: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY in packages/collector/.env");
  process.exit(1);
}

if (!filePath) {
  console.error("Uso: npm run import:events -- [--dry-run] [--register-sources] [--include-pending] percorso/eventi.csv");
  process.exit(1);
}

console.log(`Atlas Import — ${dryRun ? "ANTEPRIMA (dry-run)" : "import reale"}`);
console.log(`File: ${resolve(filePath)}`);

importEventsFromCsv({
  supabaseUrl: url,
  serviceRoleKey,
  filePath: resolve(filePath),
  dryRun,
  includePending,
  registerSources,
})
  .then((stats) => {
    console.log("\n=== Riepilogo ===");
    console.log(`Righe CSV:     ${stats.total}`);
    console.log(`Importati:     ${stats.imported}`);
    console.log(`Aggiornati:    ${stats.updated}`);
    console.log(`In pending:    ${stats.pending}`);
    console.log(`Saltati:       ${stats.skipped}`);
    if (registerSources) console.log(`Fonti reg.:    ${stats.sourcesRegistered}`);
    if (stats.warnings.length) {
      console.log("\nAvvisi:");
      stats.warnings.forEach((w) => console.log(`  • ${w}`));
    }
    if (stats.errors.length) {
      console.log("\nErrori:");
      stats.errors.forEach((e) => console.log(`  • ${e}`));
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("Errore fatale:", error);
    process.exit(1);
  });
