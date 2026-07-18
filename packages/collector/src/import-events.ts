import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  eventsLookSimilar,
  MANUAL_DISCOVERY_SOURCE_ID,
  type AtlasEvent,
  type EventCategory,
} from "@atlas/core";
import { geocodeEvent } from "./geocode.js";
import { cleanTitle, inferCategory, isPastEvent } from "./normalize.js";
import { parseCsvFile, validateHeaders, type CsvRow } from "./csv-parse.js";

const TERRITORY_ID = "IT-VT";

export interface ImportOptions {
  supabaseUrl: string;
  serviceRoleKey: string;
  filePath: string;
  dryRun?: boolean;
  includePending?: boolean;
  registerSources?: boolean;
}

export interface ImportStats {
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  pending: number;
  sourcesRegistered: number;
  errors: string[];
  warnings: string[];
}

export async function importEventsFromCsv(options: ImportOptions): Promise<ImportStats> {
  const rows = parseCsvFile(options.filePath);
  const headerErrors = validateHeaders(rows);
  if (headerErrors.length) {
    return {
      total: 0,
      imported: 0,
      updated: 0,
      skipped: 0,
      pending: 0,
      sourcesRegistered: 0,
      errors: headerErrors,
      warnings: [],
    };
  }

  const client = createClient(options.supabaseUrl, options.serviceRoleKey);
  const stats: ImportStats = {
    total: rows.length,
    imported: 0,
    updated: 0,
    skipped: 0,
    pending: 0,
    sourcesRegistered: 0,
    errors: [],
    warnings: [],
  };

  const { data: existingRows, error: loadError } = await client.from("events").select("*");
  if (loadError) {
    stats.errors.push(loadError.message);
    return stats;
  }
  const existing = (existingRows ?? []) as AtlasEvent[];

  const sourceUrls = new Set<string>();

  for (const row of rows) {
    const result = await processRow(client, row, existing, options, sourceUrls);
    if (result.action === "import") stats.imported += 1;
    else if (result.action === "update") stats.updated += 1;
    else if (result.action === "pending") stats.pending += 1;
    else stats.skipped += 1;

    if (result.error) stats.errors.push(`Riga ${row.line}: ${result.error}`);
    if (result.warning) stats.warnings.push(`Riga ${row.line}: ${result.warning}`);
  }

  if (options.registerSources && !options.dryRun) {
    stats.sourcesRegistered = await registerSourceCandidates(client, sourceUrls, stats);
  }

  return stats;
}

interface RowResult {
  action: "import" | "update" | "skip" | "pending";
  error?: string;
  warning?: string;
}

async function processRow(
  client: SupabaseClient,
  row: CsvRow,
  existing: AtlasEvent[],
  options: ImportOptions,
  sourceUrls: Set<string>,
): Promise<RowResult> {
  const v = row.values;
  const stato = v.stato.toLowerCase();

  if (stato === "scartato") return { action: "skip" };
  if (!stato && !options.includePending) return { action: "skip" };

  const title = cleanTitle(v.titolo.trim());
  if (!title) return { action: "skip", error: "titolo mancante" };

  const startDate = parseCsvDate(v.data_inizio, v.orario);
  if (!startDate) return { action: "skip", error: `data_inizio non valida: "${v.data_inizio}"` };

  const endDate = v.data_fine ? parseCsvDate(v.data_fine, v.orario) : null;
  if (isPastEvent(endDate?.toISOString() ?? null, startDate.toISOString())) {
    return { action: "skip", warning: "evento passato" };
  }

  const eventUrl = normalizeUrl(v.url_evento);
  if (!eventUrl) {
    return { action: "skip", error: "url_evento mancante (obbligatorio per tracciabilità)" };
  }

  const category = mapCategory(v.categoria, title, v.note);
  const city = v.comune.trim() || null;
  const venue = v.luogo.trim() || null;
  const sourceUrl = normalizeUrl(v.url_fonte);
  if (sourceUrl) sourceUrls.add(sourceUrl);

  const coords = await geocodeEvent(venue, city);
  const externalId = `manual:${hashExternalId(eventUrl)}`;

  const duplicateSameSource = existing.find(
    (e) =>
      e.source_id === MANUAL_DISCOVERY_SOURCE_ID &&
      ((e as AtlasEvent & { external_id?: string }).external_id === externalId ||
        e.event_url === eventUrl),
  );

  if (!duplicateSameSource) {
    const duplicateOther = existing.find((e) =>
      eventsLookSimilar(
        { title, start_date: startDate.toISOString(), venue, lat: coords.lat, lng: coords.lng },
        { title: e.title, start_date: e.start_date, venue: e.venue, lat: e.lat, lng: e.lng },
      ),
    );
    if (duplicateOther) {
      return { action: "skip", warning: `duplicato di "${duplicateOther.title}"` };
    }
  }

  const verified = stato === "ok";
  const payload = {
    title,
    category,
    start_date: startDate.toISOString(),
    end_date: endDate?.toISOString() ?? null,
    venue,
    city,
    comune: city,
    event_url: eventUrl,
    external_id: externalId,
    description: buildDescription(v),
    lat: coords.lat,
    lng: coords.lng,
    source_id: MANUAL_DISCOVERY_SOURCE_ID,
    territory_id: TERRITORY_ID,
    verified,
    review_status: verified ? "approved" : "pending",
    archived: false,
  };

  if (options.dryRun) {
    return { action: verified ? "import" : "pending" };
  }

  try {
    if (duplicateSameSource?.date_event) {
      const { error } = await client
        .from("events")
        .update(payload)
        .eq("date_event", duplicateSameSource.date_event);
      if (error) throw error;
      return { action: "update" };
    }

    const { error } = await client.from("events").insert(payload);
    if (error) throw error;

    existing.push(payload as AtlasEvent);
    return { action: verified ? "import" : "pending" };
  } catch (error) {
    return { action: "skip", error: (error as Error).message };
  }
}

function buildDescription(v: Record<string, string>): string | null {
  const parts = [
    v.organizzatore ? `Organizzatore: ${v.organizzatore}` : "",
    v.note || "",
    v.url_fonte ? `Fonte: ${v.url_fonte}` : "",
  ].filter(Boolean);
  return parts.length ? parts.join("\n") : null;
}

function mapCategory(raw: string, title: string, note: string): EventCategory {
  const value = raw.trim().toLowerCase();
  const map: Record<string, EventCategory> = {
    music: "music",
    musica: "music",
    food: "food",
    enogastronomia: "food",
    sagra: "food",
    sagre: "food",
    culture: "culture",
    cultura: "culture",
    teatro: "culture",
    sport: "sport",
    families: "families",
    famiglie: "families",
    famiglia: "families",
    bambini: "families",
    other: "other",
    altri: "other",
    altro: "other",
  };
  if (value && map[value]) return map[value];
  return inferCategory(title, [note, raw]);
}

function parseCsvDate(value: string, orario: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const iso = Date.parse(trimmed);
  if (!Number.isNaN(iso)) return applyTime(new Date(iso), orario);

  const dmy = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (dmy) {
    const [, dd, mm, yyyy, hh, min] = dmy;
    const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd), 19, 0, 0);
    if (hh) date.setHours(Number(hh), Number(min ?? 0), 0, 0);
    else applyTime(date, orario);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function applyTime(date: Date, orario: string): Date {
  const match = orario.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (match) date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date;
}

function normalizeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function hashExternalId(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 24);
}

async function registerSourceCandidates(
  client: SupabaseClient,
  urls: Set<string>,
  stats: ImportStats,
): Promise<number> {
  let count = 0;
  for (const url of urls) {
    const normalized = url.toLowerCase();
    const { error } = await client.from("source_candidates").upsert(
      {
        url: normalized,
        name: extractHostname(normalized),
        status: "new",
        territory_id: TERRITORY_ID,
        notes: "Registrato da import CSV eventi",
      },
      { onConflict: "url" },
    );
    if (error) {
      stats.warnings.push(`Fonte ${url}: ${error.message}`);
    } else {
      count += 1;
    }
  }
  return count;
}

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
