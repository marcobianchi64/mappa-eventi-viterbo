#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { importDiscoveryText } from "./import-discovery.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const filePath = args.find((a) => !a.startsWith("--"));

if (!url || !serviceRoleKey) {
  console.error(
    "Servono SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY in packages/collector/.env (chiave service role, non anon).",
  );
  process.exit(1);
}

if (!filePath) {
  console.error("Uso: npm run import:discovery -- [--dry-run] percorso/tabella.md");
  console.error("Salva la tabella ChatGPT in un file .md o .txt e passa il percorso.");
  process.exit(1);
}

const text = readFileSync(resolve(filePath), "utf8");
console.log(`Atlas import scoperta — ${dryRun ? "ANTEPRIMA" : "IMPORT REALE"}`);
console.log(`File: ${resolve(filePath)} (${text.length} caratteri)`);

importDiscoveryText({ supabaseUrl: url, serviceRoleKey, text, dryRun })
  .then((stats) => {
    console.log("\n=== Riepilogo ===");
    console.log(`Righe lette dal parser:  ${stats.parsed}`);
    console.log(`Importati:               ${stats.imported}`);
    console.log(`Saltati (duplicato):     ${stats.skippedDuplicate}`);
    console.log(`Saltati (passati):       ${stats.skippedPast}`);
    console.log(`Saltati (non validi):    ${stats.skippedInvalid}`);
    if (stats.errors.length) {
      console.log("\nDettaglio:");
      stats.errors.forEach((e) => console.log(`  • ${e}`));
    }
    if (stats.parsed === 0 || (stats.imported === 0 && !dryRun && stats.errors.length)) {
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("Errore fatale:", error);
    process.exit(1);
  });
