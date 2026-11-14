import {
  ATLAS_EDITION,
  mergeUtilitySnapshots,
  utilitySyncDataUrl,
  type UtilitySyncSnapshot,
} from "@atlas/core";
import { fetchUtilityEditionSnapshot } from "@atlas/supabase-client";

async function loadStaticUtilitySnapshot(
  editionId: string,
): Promise<UtilitySyncSnapshot | null> {
  try {
    const response = await fetch(utilitySyncDataUrl(editionId), { cache: "no-cache" });
    if (!response.ok) return null;
    return (await response.json()) as UtilitySyncSnapshot;
  } catch {
    return null;
  }
}

export async function loadUtilitySyncSnapshot(
  editionId: string = ATLAS_EDITION.id,
): Promise<UtilitySyncSnapshot | null> {
  const [staticSnap, remoteSnap] = await Promise.all([
    loadStaticUtilitySnapshot(editionId),
    fetchUtilityEditionSnapshot(editionId).catch(() => null),
  ]);
  return mergeUtilitySnapshots(staticSnap, remoteSnap);
}