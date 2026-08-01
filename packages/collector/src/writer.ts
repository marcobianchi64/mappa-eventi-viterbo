import { createClient } from "@supabase/supabase-js";
import { eventsLookSimilar, type AtlasEvent } from "@atlas/core";
import type { CollectedEvent, SourceConnectorConfig, SyncStats } from "./types.js";
import { geocodeEvent } from "./geocode.js";
import { shouldAutoPublish, validateCollectedEvent } from "./quality.js";

export interface WriterConfig {
  url: string;
  serviceRoleKey: string;
}

export class SupabaseEventWriter {
  private readonly client;

  constructor(config: WriterConfig) {
    this.client = createClient(config.url, config.serviceRoleKey);
  }

  async syncSource(source: SourceConnectorConfig, collected: CollectedEvent[]): Promise<SyncStats> {
    const stats: SyncStats = { found: collected.length, inserted: 0, updated: 0, skipped: 0, errors: [] };
    const logId = await this.startLog(source.id);

    const { data: existingRows, error: loadError } = await this.client
      .from("events")
      .select("*")
      .eq("source_id", source.id);

    if (loadError) {
      stats.errors.push(loadError.message);
      await this.finishLog(logId, "error", stats, loadError.message);
      return stats;
    }

    const existing = (existingRows ?? []) as AtlasEvent[];

    for (const item of collected) {
      const quality = validateCollectedEvent(item);
      if (!quality.ok) {
        stats.skipped += 1;
        continue;
      }

      let lat = item.lat;
      let lng = item.lng;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        const coords = await geocodeEvent(item.venue, item.city);
        lat = coords.lat;
        lng = coords.lng;
      }

      const duplicateSameSource = existing.find(
        (e) =>
          (e as AtlasEvent & { external_id?: string }).external_id === item.external_id ||
          e.event_url === item.event_url,
      );

      if (!duplicateSameSource) {
        const duplicateOther = existing.find((e) =>
          e.source_id !== source.id &&
          eventsLookSimilar(
            { title: item.title, start_date: item.start_date, venue: item.venue, lat: lat!, lng: lng! },
            { title: e.title, start_date: e.start_date, venue: e.venue, lat: e.lat, lng: e.lng },
          ),
        );
        if (duplicateOther) {
          stats.skipped += 1;
          continue;
        }
      }

      const autoPublish = shouldAutoPublish(source.reliability, quality, true);
      const payload = {
        title: item.title,
        category: item.category,
        start_date: item.start_date,
        end_date: item.end_date ?? null,
        venue: item.venue ?? null,
        event_url: item.event_url,
        external_id: item.external_id,
        image_url: item.image_url ?? null,
        description: item.description ?? null,
        lat,
        lng,
        source_id: source.id,
        territory_id: source.territory_id,
        city: item.city ?? null,
        verified: autoPublish,
        review_status: autoPublish ? "approved" : "pending",
        archived: false,
      };

      try {
        if (duplicateSameSource?.date_event) {
          const { error } = await this.client
            .from("events")
            .update(payload)
            .eq("date_event", duplicateSameSource.date_event);
          if (error) throw error;
          stats.updated += 1;
        } else {
          const { error } = await this.client.from("events").insert(payload);
          if (error) throw error;
          stats.inserted += 1;
        }
      } catch (error) {
        stats.errors.push(`${item.title}: ${(error as Error).message}`);
        stats.skipped += 1;
      }
    }

    await this.client
      .from("sources")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: stats.errors.length ? "partial" : "success",
        events_produced: stats.inserted + stats.updated,
        status: "active",
      })
      .eq("id", source.id);

    await this.finishLog(
      logId,
      stats.errors.length ? "partial" : "success",
      stats,
      `Inseriti ${stats.inserted}, aggiornati ${stats.updated}, saltati ${stats.skipped}`,
    );

    return stats;
  }

  private async startLog(sourceId: string): Promise<string> {
    const { data, error } = await this.client
      .from("source_sync_logs")
      .insert({ source_id: sourceId, status: "running" })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return data.id as string;
  }

  private async finishLog(
    logId: string,
    status: "success" | "partial" | "error",
    stats: SyncStats,
    message: string,
  ): Promise<void> {
    await this.client
      .from("source_sync_logs")
      .update({
        status,
        finished_at: new Date().toISOString(),
        events_found: stats.found,
        events_inserted: stats.inserted,
        events_updated: stats.updated,
        events_skipped: stats.skipped,
        message,
        details: { errors: stats.errors },
      })
      .eq("id", logId);
  }
}
