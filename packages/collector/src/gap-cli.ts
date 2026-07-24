#!/usr/bin/env node
import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { formatGapReport, generateGapReport } from "./gap-report.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const daysArg = process.argv.find((a) => a.startsWith("--days="));
const days = daysArg ? Number(daysArg.split("=")[1]) : 60;

if (!url || !serviceRoleKey) {
  console.error("Variabili richieste: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

generateGapReport({ supabaseUrl: url, serviceRoleKey, days })
  .then((report) => console.log(formatGapReport(report, days)))
  .catch((error) => {
    console.error("Errore:", error);
    process.exit(1);
  });
