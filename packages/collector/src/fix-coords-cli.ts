#!/usr/bin/env node
import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  distanceKm,
  formatComuneLabel,
  geocodeEventPlace,
  isLegacyViterboCenter,
  VITERBO_PROVINCE_CENTER,
  type AtlasEvent,
} from "@atlas/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");

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

  console.log("=== Correzione coordinate eventi (comuni e frazioni) ===\n");

  for (const event of events) {
    const place = geocodeEventPlace({
      comune: event.comune,
      city: event.city,
      venue: event.venue,
      title: event.title,
      location: event.location,
    });

    if (!place.comuneKey && !place.localitaKey) {
      skipped += 1;
      continue;
    }

    const dist = distanceKm(event.lat, event.lng, place.lat, place.lng);
    const needsCoords =
      force ||
      dist > 1.2 ||
      (isDefaultViterboCoords(event.lat, event.lng) && Boolean(place.localitaKey));

    const comuneKey = place.comuneKey;
    const needsComuneField = comuneKey && !(event.comune ?? event.city)?.trim();

    if (!needsCoords && !needsComuneField) {
      skipped += 1;
      continue;
    }

    const label = comuneKey ? formatComuneLabel(comuneKey) : event.comune ?? "—";
    const where = place.localitaLabel ? `${place.localitaLabel} → ${label}` : label;
    console.log(
      `${dryRun ? "[dry-run] " : ""}${event.title}`,
      `| ${where}`,
      `| ${event.lat.toFixed(4)},${event.lng.toFixed(4)} → ${place.lat.toFixed(4)},${place.lng.toFixed(4)}`,
      `| dist ${dist.toFixed(1)} km`,
    );

    if (!dryRun) {
      const patch: Record<string, unknown> = {
        lat: place.lat,
        lng: place.lng,
        province: "Viterbo",
      };
      if (comuneKey) {
        patch.comune = label;
        patch.city = label;
      }
      const { error: updateError } = await client
        .from("events")
        .update(patch)
        .eq("date_event", event.date_event);

      if (updateError) throw new Error(updateError.message);
    }
    updated += 1;
  }

  console.log(`\nCompletato: ${updated} aggiornati, ${skipped} già ok o luogo non riconosciuto.`);
}

main().catch((error) => {
  console.error("Errore:", error);
  process.exit(1);
});
