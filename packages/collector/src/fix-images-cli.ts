#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { runCli } from "./cli-exit.js";
import { enrichPublishedEventImages } from "./enrich-event-images.js";

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
  console.log(
    dryRun
      ? "Modalità dry-run — solo eventi in pubblicazione senza locandina"
      : "Arricchimento locandine — solo eventi in pubblicazione",
  );

  const result = await enrichPublishedEventImages(client, {
    dryRun,
    limit,
    delayMs: 350,
    onProgress: (event, outcome, detail) => {
      const label = event.title.slice(0, 56);
      if (outcome === "ok") {
        console.log(`• ${label}… ${dryRun ? `[dry-run] ${detail}` : "ok"}`);
      } else if (outcome === "miss") {
        console.log(`• ${label}… nessuna immagine`);
      } else {
        console.log(`• ${label}… errore${detail ? `: ${detail}` : ""}`);
      }
    },
  });

  console.log(
    `\nCompletato: ${result.candidates} candidati, ${result.updated} aggiornati, ${result.failed} senza immagine o errore.`,
  );
});
