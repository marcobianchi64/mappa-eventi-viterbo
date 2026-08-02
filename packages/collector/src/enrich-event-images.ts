import type { SupabaseClient } from "@supabase/supabase-js";
import { isHttpUrl, isRegistryInPubblicazione, type AtlasEvent } from "@atlas/core";
import { resolveEventImageFromUrlThrottled } from "./resolve-event-image.js";

export interface EnrichEventImagesResult {
  candidates: number;
  processed: number;
  updated: number;
  failed: number;
}

export interface EnrichEventImagesOptions {
  dryRun?: boolean;
  limit?: number;
  delayMs?: number;
  onProgress?: (event: AtlasEvent, outcome: "ok" | "miss" | "error", detail?: string) => void;
}

/** Evento visibile in mappa/elenco che può ricevere una locandina automatica. */
export function needsEventImageEnrichment(event: AtlasEvent): boolean {
  return (
    isRegistryInPubblicazione(event) &&
    isHttpUrl(event.event_url) &&
    !isHttpUrl(event.image_url)
  );
}

/** Scarica og:image (o equivalente) per eventi in pubblicazione senza image_url. */
export async function enrichPublishedEventImages(
  client: SupabaseClient,
  options: EnrichEventImagesOptions = {},
): Promise<EnrichEventImagesResult> {
  const { dryRun = false, limit = 0, delayMs = 350, onProgress } = options;

  const { data, error } = await client
    .from("events")
    .select("date_event,title,event_url,image_url,archived,verified,review_status,start_date,end_date")
    .eq("archived", false)
    .eq("verified", true)
    .order("start_date", { ascending: true });

  if (error) throw new Error(error.message);

  const candidates = ((data ?? []) as AtlasEvent[]).filter(needsEventImageEnrichment);
  const toProcess = limit > 0 ? candidates.slice(0, limit) : candidates;

  const result: EnrichEventImagesResult = {
    candidates: candidates.length,
    processed: toProcess.length,
    updated: 0,
    failed: 0,
  };

  for (const event of toProcess) {
    const pageUrl = event.event_url!.trim();
    let imageUrl: string | null = null;
    try {
      imageUrl = await resolveEventImageFromUrlThrottled(pageUrl, delayMs);
    } catch {
      imageUrl = null;
    }

    if (!imageUrl) {
      result.failed += 1;
      onProgress?.(event, "miss");
      continue;
    }

    if (dryRun) {
      result.updated += 1;
      onProgress?.(event, "ok", imageUrl);
      continue;
    }

    const { error: upErr } = await client
      .from("events")
      .update({ image_url: imageUrl })
      .eq("date_event", event.date_event);

    if (upErr) {
      result.failed += 1;
      onProgress?.(event, "error", upErr.message);
      continue;
    }

    result.updated += 1;
    onProgress?.(event, "ok", imageUrl);
  }

  return result;
}
