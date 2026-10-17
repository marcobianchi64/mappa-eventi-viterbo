import { readFileSync } from "node:fs";
import { AUTO_SOURCES } from "@atlas/collector";

const migration = readFileSync("supabase/migrations/011_radar_sources_registry.sql", "utf8");

const ids = AUTO_SOURCES.map((s) => s.id);
for (const id of ids) {
  if (!migration.includes(`'${id}'`) && id !== "src-tusciaweb-eventi") {
    console.error(`verify-radar-registry: ${id} mancante in migration 011`);
    process.exit(1);
  }
}

const connectors = new Set(AUTO_SOURCES.map((s) => s.connector));
for (const c of connectors) {
  if (!migration.includes(`'${c}'`)) {
    console.warn(`verify-radar-registry: connettore ${c} non citato in migration (ok se backfill)`);
  }
}

console.log(`verify-radar-registry OK — ${ids.length} fonti statiche, migration 011 presente`);
