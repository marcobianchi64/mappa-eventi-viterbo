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
  isEventVisibleInRange,
  isRegistryInPubblicazione,
  type AtlasEvent,
} from "@atlas/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });
config({ path: resolve(__dirname, "../../../apps/web/.env") });

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

const TARGETS = ["graffignano", "vitorchiano", "vignanello"];

if (!url || !serviceRoleKey) {
  console.error("Richiesti SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("it-IT");
}

function describeEvent(event: AtlasEvent, source: string): string[] {
  const inferred = inferComuneForEvent(event);
  const expected = inferred ? geocodeComuneViterbo(inferred) : null;
  const dist = expected ? distanceKm(event.lat, event.lng, expected.lat, expected.lng) : null;
  const onMap60 = isEventVisibleInRange(event, "60");
  const inRegistro = isRegistryInPubblicazione(event);

  return [
    `[${source}] ${event.title}`,
    `  ID: ${event.date_event}`,
    `  comune DB: ${event.comune ?? "—"} | city: ${event.city ?? "—"}`,
    `  luogo: ${event.venue ?? "—"}`,
    `  data: ${formatDate(event.start_date)}`,
    `  pin: ${event.lat.toFixed(4)}, ${event.lng.toFixed(4)}`,
    `  comune inferito: ${inferred ? formatComuneLabel(inferred) : "—"}`,
    expected
      ? `  atteso: ${expected.lat.toFixed(4)}, ${expected.lng.toFixed(4)} (dist ${dist?.toFixed(1)} km)`
      : "  atteso: —",
    `  registro in pub.: ${inRegistro ? "sì" : "no"} | mappa 60gg: ${onMap60 ? "sì" : "no"}`,
    `  fonte: ${event.source_id ?? "—"}`,
    "",
  ];
}

async function fetchVerified(client: ReturnType<typeof createClient<any>>): Promise<AtlasEvent[]> {
  const { data, error } = await client.from("events").select("*").eq("verified", true);
  if (error) throw new Error(error.message);
  return ((data ?? []) as AtlasEvent[]).filter((e) => e.archived !== true);
}

function matchesTarget(event: AtlasEvent): boolean {
  const haystack = [
    event.comune,
    event.city,
    event.venue,
    event.title,
    event.location,
    inferComuneForEvent(event),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return TARGETS.some((t) => haystack.includes(t));
}

async function main(): Promise<void> {
  const admin = createClient(url!, serviceRoleKey!);
  const adminEvents = await fetchVerified(admin);

  let anonEvents: AtlasEvent[] = [];
  if (anonKey) {
    anonEvents = await fetchVerified(createClient(url!, anonKey));
  }

  const hits = adminEvents.filter(matchesTarget);

  console.log("=== Diagnosi comuni campione ===");
  console.log(`Cerco: ${TARGETS.map((t) => formatComuneLabel(t)).join(", ")}\n`);
  console.log(`Eventi verificati totali (admin): ${adminEvents.length}`);
  if (anonKey) console.log(`Eventi visibili API pubblica: ${anonEvents.length}`);
  console.log(`Eventi che matchano i 3 comuni: ${hits.length}\n`);

  if (hits.length === 0) {
    console.log("NESSUN evento trovato con questi comuni nel DB.");
    console.log("Controlla nel Registro se il comune è solo nel titolo con nome diverso.\n");
    console.log("Suggerimento: cerca nel Registro per titolo e verifica colonna Comune.\n");

    console.log("--- Tutti i comuni presenti nel DB ---");
    const counts = new Map<string, number>();
    for (const e of adminEvents) {
      const c = (e.comune ?? e.city ?? inferComuneForEvent(e) ?? "—").toString();
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .forEach(([c, n]) => console.log(`  ${n}× ${c}`));
    return;
  }

  for (const event of hits) {
    console.log(...describeEvent(event, "admin"));
    const onAnon = anonEvents.some((e) => e.date_event === event.date_event);
    if (anonKey) {
      console.log(`  API pubblica lo vede: ${onAnon ? "sì" : "NO (bloccato RLS?)"}`);
      console.log("");
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
