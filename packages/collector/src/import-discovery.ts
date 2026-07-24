import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  discoveryEventExternalId,
  eventsAreDiscoveryDuplicates,
  formatComuneLabel,
  geocodeComuneViterbo,
  inferComuneFromText,
  MANUAL_DISCOVERY_SOURCE_ID,
  parseDiscoveryDateTime,
  parseDiscoveryText,
  resolveEventCategory,
  type AtlasEvent,
  type DiscoveryRow,
  type DuplicateComparableEvent,
} from "@atlas/core";

export interface ImportDiscoveryOptions {
  supabaseUrl: string;
  serviceRoleKey: string;
  text: string;
  dryRun?: boolean;
}

export interface ImportDiscoveryStats {
  parsed: number;
  imported: number;
  skippedDuplicate: number;
  skippedPast: number;
  skippedInvalid: number;
  errors: string[];
}

function rowToComparable(row: DiscoveryRow): DuplicateComparableEvent | null {
  const start = parseDiscoveryDateTime(row.data_inizio, row.orario);
  if (!start) return null;
  const end = row.data_fine ? parseDiscoveryDateTime(row.data_fine, row.orario) : null;
  const comuneKey =
    inferComuneFromText(row.comune, row.luogo, row.titolo) ??
    (row.comune?.trim() ? row.comune.trim().toLowerCase() : null);
  const comune = comuneKey ? formatComuneLabel(comuneKey) : row.comune?.trim() || null;
  const coords = geocodeComuneViterbo(comuneKey ?? comune);

  return {
    title: row.titolo.trim(),
    start_date: start.toISOString(),
    end_date: end?.toISOString() ?? null,
    venue: row.luogo?.trim() || null,
    comune,
    city: comune,
    lat: coords.lat,
    lng: coords.lng,
    event_url: row.url_evento?.trim() || null,
  };
}

async function loadExisting(client: SupabaseClient): Promise<AtlasEvent[]> {
  const all: AtlasEvent[] = [];
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await client
      .from("events")
      .select("*")
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as AtlasEvent[];
    all.push(...batch.filter((e) => e.archived !== true));
    if (batch.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

export async function importDiscoveryText(options: ImportDiscoveryOptions): Promise<ImportDiscoveryStats> {
  const stats: ImportDiscoveryStats = {
    parsed: 0,
    imported: 0,
    skippedDuplicate: 0,
    skippedPast: 0,
    skippedInvalid: 0,
    errors: [],
  };

  const rows = parseDiscoveryText(options.text);
  stats.parsed = rows.length;
  if (rows.length === 0) {
    stats.errors.push("Nessuna riga riconosciuta nel testo (serve una tabella con | e colonna titolo).");
    return stats;
  }

  const client = createClient(options.supabaseUrl, options.serviceRoleKey);
  const existing = await loadExisting(client);
  const acceptedInBatch: DuplicateComparableEvent[] = [];

  for (const row of rows) {
    const title = row.titolo?.trim();
    if (!title) {
      stats.skippedInvalid += 1;
      continue;
    }

    const start = parseDiscoveryDateTime(row.data_inizio, row.orario);
    if (!start) {
      stats.skippedInvalid += 1;
      stats.errors.push(`Data non valida: ${title}`);
      continue;
    }
    if (start.getTime() < Date.now() - 86400000) {
      stats.skippedPast += 1;
      continue;
    }

    const candidate = rowToComparable(row);
    if (!candidate) {
      stats.skippedInvalid += 1;
      continue;
    }

    const pool = [...existing, ...acceptedInBatch];
    const externalId = discoveryEventExternalId(
      title,
      start.toISOString(),
      candidate.comune ?? candidate.city ?? "",
    );
    const duplicate = pool.find((e) => {
      const ext = (e as AtlasEvent).external_id;
      if (ext && ext === externalId) return true;
      const other: DuplicateComparableEvent = {
        title: e.title,
        start_date: e.start_date,
        end_date: e.end_date,
        venue: e.venue,
        comune: e.comune,
        city: e.city,
        lat: e.lat,
        lng: e.lng,
        event_url: e.event_url,
      };
      return eventsAreDiscoveryDuplicates(candidate, other);
    });

    if (duplicate) {
      stats.skippedDuplicate += 1;
      continue;
    }

    if (options.dryRun) {
      stats.imported += 1;
      acceptedInBatch.push(candidate);
      continue;
    }

    const end = row.data_fine ? parseDiscoveryDateTime(row.data_fine, row.orario) : null;
    const comuneKey =
      inferComuneFromText(row.comune, row.luogo, row.titolo) ??
      (row.comune?.trim() ? row.comune.trim().toLowerCase() : null);
    const comune = comuneKey ? formatComuneLabel(comuneKey) : row.comune?.trim() || null;
    const coords = geocodeComuneViterbo(comuneKey ?? comune);

    const { error } = await client.from("events").insert({
      title: row.titolo.trim(),
      category: resolveEventCategory(row.categoria, row.titolo, [row.note ?? "", row.luogo ?? ""]),
      start_date: start.toISOString(),
      end_date: end?.toISOString() ?? null,
      venue: row.luogo?.trim() || null,
      city: comune,
      comune,
      province: "Viterbo",
      event_url: row.url_evento?.trim() || null,
      description: [row.organizzatore, row.note, row.url_fonte ? `Fonte: ${row.url_fonte}` : ""]
        .filter(Boolean)
        .join("\n"),
      lat: coords.lat,
      lng: coords.lng,
      source_id: MANUAL_DISCOVERY_SOURCE_ID,
      territory_id: "IT-VT",
      external_id: externalId,
      verified: true,
      review_status: "approved",
      archived: false,
    });

    if (error) {
      stats.errors.push(`${title}: ${error.message}`);
      continue;
    }

    stats.imported += 1;
    acceptedInBatch.push(candidate);
  }

  return stats;
}
