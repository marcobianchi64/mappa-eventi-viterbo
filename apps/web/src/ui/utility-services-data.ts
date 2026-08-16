import { ATLAS_EDITION, utilitySyncDataUrl, type UtilitySyncSnapshot } from "@atlas/core";

export async function loadUtilitySyncSnapshot(
  editionId: string = ATLAS_EDITION.id,
): Promise<UtilitySyncSnapshot | null> {
  try {
    const response = await fetch(utilitySyncDataUrl(editionId), { cache: "no-cache" });
    if (!response.ok) return null;
    return (await response.json()) as UtilitySyncSnapshot;
  } catch {
    return null;
  }
}
