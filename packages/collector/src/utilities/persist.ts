import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { OperationalAlertDraft, UtilitySyncSnapshot } from "@atlas/core";
import type { WriterConfig } from "../writer.js";

const PHARMACY_SOURCE_ID = "src-pg-pharmacy-vt";
const CINEMA_SOURCE_ID = "src-mymovies-vt";

function contentHash(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

/** Persiste l'osservazione giornaliera senza sostituire il registro dei luoghi. */
export class UtilitySyncWriter {
  private readonly client;

  constructor(config: WriterConfig) {
    this.client = createClient(config.url, config.serviceRoleKey);
  }

  async persist(snapshot: UtilitySyncSnapshot): Promise<void> {
    await this.persistObservations(snapshot);
    await this.syncOperationalAlerts(snapshot.operationalAlerts ?? []);
  }

  private async persistObservations(snapshot: UtilitySyncSnapshot): Promise<void> {
    const rows = [
      {
        source_id: PHARMACY_SOURCE_ID,
        domain: "utilities",
        duty_date: snapshot.pharmacies.dutyDate ?? null,
        payload: snapshot.pharmacies,
        item_count: snapshot.pharmacies.items.length,
        content_hash: contentHash(snapshot.pharmacies),
        status: "processed",
      },
      {
        source_id: CINEMA_SOURCE_ID,
        domain: "utilities",
        duty_date: null,
        payload: {
          cinema: snapshot.cinema,
          coverage: snapshot.coverage?.cinema ?? null,
        },
        item_count: snapshot.cinema.venues?.length ?? snapshot.cinema.items.length,
        content_hash: contentHash({
          cinema: snapshot.cinema,
          coverage: snapshot.coverage?.cinema ?? null,
        }),
        status: "processed",
      },
    ];

    const { error } = await this.client.from("source_observations").insert(rows);
    if (error) throw new Error(`Osservazioni utility: ${error.message}`);
  }

  private async syncOperationalAlerts(drafts: OperationalAlertDraft[]): Promise<void> {
    const openByPlace = new Set(drafts.map((draft) => draft.placeId).filter(Boolean));
    const { data: existing, error: loadError } = await this.client
      .from("operational_alerts")
      .select("id, alert_type, place_id, status, consecutive_misses")
      .eq("alert_type", "place_silent")
      .in("status", ["open", "acknowledged"]);

    if (loadError) throw new Error(`Lettura alert operativi: ${loadError.message}`);

    const byKey = new Map(
      (existing ?? []).map((row) => [`${row.alert_type}:${row.place_id ?? ""}`, row]),
    );

    for (const draft of drafts) {
      const key = `${draft.alertType}:${draft.placeId ?? ""}`;
      const current = byKey.get(key) as
        | { id: string; consecutive_misses: number | null }
        | undefined;
      const payload = {
        severity: draft.severity,
        territory_id: draft.territoryId ?? null,
        source_id: draft.sourceId ?? null,
        place_id: draft.placeId ?? null,
        title: draft.title,
        message: draft.message,
        details: draft.details ?? {},
        last_seen_at: new Date().toISOString(),
      };

      if (current) {
        const { error } = await this.client
          .from("operational_alerts")
          .update({ ...payload, consecutive_misses: (current.consecutive_misses ?? 0) + 1 })
          .eq("id", current.id);
        if (error) throw new Error(`Aggiornamento alert operativo: ${error.message}`);
      } else {
        const { error } = await this.client.from("operational_alerts").insert({
          ...payload,
          alert_type: draft.alertType,
          consecutive_misses: 1,
          status: "open",
        });
        if (error) throw new Error(`Creazione alert operativo: ${error.message}`);
      }
    }

    for (const row of existing ?? []) {
      if (!row.place_id || openByPlace.has(row.place_id)) continue;
      const { error } = await this.client
        .from("operational_alerts")
        .update({ status: "resolved", resolved_at: new Date().toISOString() })
        .eq("id", row.id);
      if (error) throw new Error(`Risoluzione alert operativo: ${error.message}`);
    }
  }
}
