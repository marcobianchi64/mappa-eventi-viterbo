#!/usr/bin/env node
import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { UtilitySyncSnapshot } from "@atlas/core";
import { syncUtilities } from "./utilities/sync.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const persistence =
  supabaseUrl && serviceRoleKey ? { supabaseUrl, serviceRoleKey } : undefined;

syncUtilities({ persistence })
  .then((snapshot: UtilitySyncSnapshot) => {
    console.log(
      `\nRiepilogo: ${snapshot.pharmacies.items.length} farmacie, ${snapshot.cinema.items.length} film`,
    );
    if (!persistence) {
      console.log("Osservazioni Supabase non salvate: credenziali service role non configurate.");
    }
  })
  .catch((error: unknown) => {
    console.error("Errore sync utilità:", error);
    process.exit(1);
  });
