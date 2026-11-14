import { createClient } from "@supabase/supabase-js";
import type { UtilitySyncSnapshot } from "@atlas/core";

export async function publishPublicUtilitySnapshot(
  snapshot: UtilitySyncSnapshot,
  config: { url: string; serviceRoleKey: string },
): Promise<void> {
  const client = createClient(config.url, config.serviceRoleKey);
  const { error } = await client.from("utility_edition_snapshots").upsert(
    {
      edition_id: snapshot.editionId,
      territory_id: snapshot.territoryId,
      snapshot,
      pharmacy_duty_date: snapshot.pharmacies.dutyDate ?? null,
      synced_at: snapshot.syncedAt,
    },
    { onConflict: "edition_id" },
  );
  if (error) throw new Error(`utility_edition_snapshots: ${error.message}`);
  console.log(`✓ Snapshot pubblico su Supabase (${snapshot.editionId}, turno ${snapshot.pharmacies.dutyDate ?? "?"})`);
}