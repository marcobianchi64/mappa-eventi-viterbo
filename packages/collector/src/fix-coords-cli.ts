#!/usr/bin/env node
import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  distanceKm,
  formatComuneLabel,
  geocodeComuneViterbo,
  inferComuneForEvent,
  isLegacyViterboCenter,
  isPinFarFromComune,
  VITERBO_PROVINCE_CENTER,
  type AtlasEvent,
} from "@atlas/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.argv.includes("--dry-run");

if (!url || !serviceRoleKey) {
  console.error("Richiesti SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY in packages/collector/.env");
  process.exit(1);
}

function isDefaultViterboCoords(lat: number, lng: number): boolean {
  if (isLegacyViterboCenter(lat, lng)) return true;
  return (
    Math.abs(lat - VITERBO_PROVINCE_CENTER.lat) < 0.003 &&
    Math.abs(lng - VITERBO_PROVINCE_CENTER.lng) < 0.003
  );
}

async function main(): Promise<void> {
  const client = createClient(url!, serviceRoleKey!);
  const { data, error } = await client.from("events").select("*").eq("verified", true);

  if (error) throw new Error(error.message);

  const events = (data ?? []) as AtlasEvent[];
  let updated = 0;
  let skipped = 0;

  console.log("=== Correzione coordinate eventi ===\n");

  for (const event of events) {
    const comuneKey = inferComuneForEvent(event);
    if (!comuneKey || comuneKey === "viterbo") {
      skipped += 1;
      continue;
    }

    const coords = geocodeComuneViterbo(comuneKey);
    const dist = distanceKm(event.lat, event.lng, coords.lat, coords.lng);
    const needsComuneField = !(event.comune ?? event.city)?.trim();
    const needsCoords = isDefaultViterboCoords(event.lat, event.lng) || isPinFarFromComune(event, 3);

    if (!needsCoords && !needsComuneField) {
      skipped += 1;
      continue;
    }

    const label = formatComuneLabel(comuneKey);
    console.log(
      `${dryRun ? "[dry-run] " : ""}${event.title}`,
      `| ${label} (da: ${event.comune ?? event.city ?? "testo"})`,
      `| ${event.lat.toFixed(4)},${event.lng.toFixed(4)} → ${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}`,
      `| dist ${dist.toFixed(1)} km`,
    );

    if (!dryRun) {
      const { error: updateError } = await client
        .from("events")
        .update({
          lat: coords.lat,
          lng: coords.lng,
          comune: label,
          city: label,
          province: "Viterbo",
        })
        .eq("date_event", event.date_event);

      if (updateError) throw new Error(updateError.message);
    }
    updated += 1;
  }

  console.log(`\nCompletato: ${updated} aggiornati, ${skipped} già ok o senza comune riconosciuto.`);
}

main().catch((error) => {
  console.error("Errore:", error);
  process.exit(1);
});
