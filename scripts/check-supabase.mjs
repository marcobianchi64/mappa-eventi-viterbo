#!/usr/bin/env node
/**
 * Diagnostica rapida connessione Supabase (Windows cmd / Git Bash).
 * Legge apps/web/.env e apps/admin/.env e verifica lettura eventi.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const webEnv = loadEnv(resolve("apps/web/.env"));
const adminEnv = loadEnv(resolve("apps/admin/.env"));
const url = webEnv.VITE_SUPABASE_URL || adminEnv.VITE_SUPABASE_URL;
const anonKey = webEnv.VITE_SUPABASE_ANON_KEY || adminEnv.VITE_SUPABASE_ANON_KEY;

console.log("=== Diagnostica Supabase Atlas ===\n");

if (!existsSync(resolve("apps/web/.env"))) {
  console.log("❌ Manca apps/web/.env");
  console.log("   Esegui: copy apps\\web\\.env.example apps\\web\\.env");
}
if (!existsSync(resolve("apps/admin/.env"))) {
  console.log("❌ Manca apps/admin/.env");
  console.log("   Esegui: copy apps\\admin\\.env.example apps\\admin\\.env");
}

if (!url) {
  console.log("❌ VITE_SUPABASE_URL non impostato nei file .env");
  process.exit(1);
}

if (!anonKey || anonKey.includes("your_supabase_anon_key")) {
  console.log("❌ VITE_SUPABASE_ANON_KEY mancante o ancora quella di esempio");
  console.log("   Vai su Supabase → Settings → API → copia la chiave «anon public»");
  console.log("   e incollala in apps/web/.env e apps/admin/.env");
  process.exit(1);
}

console.log(`URL: ${url}`);
console.log(`Chiave anon: ${anonKey.slice(0, 8)}…${anonKey.slice(-4)} (ok)\n`);

async function probe(table, query = "select=*&limit=1") {
  const endpoint = `${url}/rest/v1/${table}?${query}`;
  const res = await fetch(endpoint, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Prefer: "count=exact",
    },
  });
  const countHeader = res.headers.get("content-range");
  const count = countHeader?.split("/")[1] ?? "?";
  const body = await res.text();
  return { ok: res.ok, status: res.status, count, body: body.slice(0, 200) };
}

try {
  const events = await probe("events", "select=date_event&verified=eq.true&limit=1");
  if (!events.ok) {
    console.log(`❌ Tabella events: HTTP ${events.status}`);
    console.log(`   ${events.body}`);
  } else {
    console.log(`✅ Eventi verificati nel database: ${events.count}`);
    if (events.count === "0") {
      console.log("   → Il DB è vuoto o nessun evento è verified=true");
      console.log("   → Controlla su Supabase Table Editor la tabella events");
    }
  }

  const sources = await probe("sources", "select=id&status=eq.active&limit=1");
  if (!sources.ok) {
    console.log(`❌ Tabella sources: HTTP ${sources.status} — forse mancano le migration SQL`);
  } else {
    console.log(`✅ Fonti attive: ${sources.count}`);
  }

  const alerts = await probe("operational_alerts", "select=id&limit=1");
  if (!alerts.ok) {
    console.log(`❌ Tabella operational_alerts: HTTP ${alerts.status}`);
    console.log("   → Esegui su Supabase SQL Editor: supabase/migrations/007_aim_registry.sql");
  } else {
    console.log(`✅ Alert operativi (tabella presente): ${alerts.count}`);
  }

  console.log("\n--- Control Center ---");
  console.log("Per vedere TUTTI i dati admin devi:");
  console.log("1. Aprire http://localhost:5174");
  console.log("2. Fare login con la tua email amministratore (link via email)");
  console.log("3. Senza login vedi solo dati pubblici (pochi o zero)");
} catch (error) {
  console.log(`❌ Errore di rete: ${error.message}`);
  process.exit(1);
}
