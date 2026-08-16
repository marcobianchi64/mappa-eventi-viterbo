#!/usr/bin/env node
import type { UtilitySyncSnapshot } from "@atlas/core";
import { syncUtilities } from "./utilities/sync.js";

syncUtilities()
  .then((snapshot: UtilitySyncSnapshot) => {
    console.log(
      `\nRiepilogo: ${snapshot.pharmacies.items.length} farmacie, ${snapshot.cinema.items.length} film`,
    );
  })
  .catch((error: unknown) => {
    console.error("Errore sync utilità:", error);
    process.exit(1);
  });
