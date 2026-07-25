#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  getCategoryMeta,
  getDisplayCategory,
  getEventDisplayTitle,
  inferCategoryFromTitle,
  isEventVisibleInRange,
  type AtlasEvent,
} from "@atlas/core";
import { runCli } from "./cli-exit.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Richiesti SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

runCli(async () => {
  const client = createClient(url, serviceRoleKey);
  const { data, error } = await client.from("events").select("*").eq("archived", false).eq("verified", true);
  if (error) throw new Error(error.message);

  const events = (data ?? []) as AtlasEvent[];
  const visible = events.filter((e) => isEventVisibleInRange(e, "60"));
  const otherOnMap = visible.filter((e) => getDisplayCategory(e) === "other");

  console.log(`=== Categorie mappa (60g) ===`);
  console.log(`Eventi visibili: ${visible.length}`);
  console.log(`Ancora «Altri eventi» (★): ${otherOnMap.length}`);
  console.log("");

  for (const event of otherOnMap) {
    const displayTitle = getEventDisplayTitle(event);
    console.log(`★ ${displayTitle}`);
    console.log(`  DB titolo: ${event.title}`);
    console.log(`  DB categoria: ${event.category} | inferenza titolo DB: ${inferCategoryFromTitle(event.title) ?? "—"} | inferenza titolo mostrato: ${inferCategoryFromTitle(displayTitle) ?? "—"}`);
    console.log(`  → mappa: ${getCategoryMeta(getDisplayCategory(event)).label} | ID ${event.date_event}`);
    console.log("");
  }
});
