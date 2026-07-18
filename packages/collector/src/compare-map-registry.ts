import { createClient } from "@supabase/supabase-js";
import {
  isEventVisibleInRange,
  isRegistryInPubblicazione,
  type AtlasEvent,
} from "@atlas/core";

export interface CompareMapRegistryOptions {
  supabaseUrl: string;
  serviceRoleKey: string;
  anonKey?: string;
  rangeDays?: "60" | "30" | "15";
}

export interface CompareEventRow {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  comune: string;
  source_id: string;
  lat: number;
  lng: number;
  verified: boolean;
  reason?: string;
}

export interface CompareMapRegistryReport {
  generatedAt: string;
  rangeDays: string;
  registryInPubblicazione: number;
  mapVisible: number;
  inBoth: number;
  onlyRegistry: CompareEventRow[];
  onlyMap: CompareEventRow[];
  registryOutsideRange: CompareEventRow[];
  registryInRangeButMissingOnMap: CompareEventRow[];
  /** Eventi che la mappa carica davvero (chiave anon + RLS) */
  publicApiFetched: number | null;
  publicApiVisible60: number | null;
  blockedByPublicApi: CompareEventRow[];
}

function eventKey(event: AtlasEvent): string {
  return event.date_event ?? `${event.title}|${event.start_date}`;
}

function toRow(event: AtlasEvent, reason?: string): CompareEventRow {
  return {
    id: event.date_event ?? "—",
    title: event.title,
    start_date: event.start_date,
    end_date: event.end_date ?? null,
    comune: (event.comune ?? event.city ?? "").trim() || "—",
    source_id: event.source_id ?? "—",
    lat: event.lat,
    lng: event.lng,
    verified: event.verified === true,
    reason,
  };
}

function hasValidCoords(event: AtlasEvent): boolean {
  return Number.isFinite(Number(event.lat)) && Number.isFinite(Number(event.lng));
}

/** Finestra calendario semplice: da oggi 00:00 a oggi+N giorni 23:59. */
function isInCalendarDays(event: AtlasEvent, days: number): boolean {
  const start = new Date(event.start_date);
  const end = event.end_date ? new Date(event.end_date) : start;
  if (Number.isNaN(start.getTime())) return false;

  const now = new Date();
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + days);
  to.setHours(23, 59, 59, 999);

  if (end < from) return false;
  return start <= to;
}

export async function compareMapRegistry(
  options: CompareMapRegistryOptions,
): Promise<CompareMapRegistryReport> {
  const range = options.rangeDays ?? "60";
  const client = createClient(options.supabaseUrl, options.serviceRoleKey);

  const { data, error } = await client
    .from("events")
    .select("*")
    .order("start_date", { ascending: true });

  if (error) throw new Error(error.message);

  const all = (data ?? []) as AtlasEvent[];
  const registry = all.filter(isRegistryInPubblicazione);
  const mapVisible = all.filter((e) => isEventVisibleInRange(e, range));

  const registryKeys = new Set(registry.map(eventKey));
  const mapKeys = new Set(mapVisible.map(eventKey));

  const onlyRegistry = registry
    .filter((e) => !mapKeys.has(eventKey(e)))
    .map((e) => {
      const days = Number(range);
      if (!isInCalendarDays(e, days)) {
        return toRow(e, `oltre ${range} giorni (calendario)`);
      }
      if (!hasValidCoords(e)) {
        return toRow(e, "coordinate mancanti o non valide");
      }
      return toRow(e, "nella finestra ma escluso dal filtro mappa attuale");
    });

  const onlyMap = mapVisible
    .filter((e) => !registryKeys.has(eventKey(e)))
    .map((e) => toRow(e, "sulla mappa ma non «in pubblicazione» nel Registro"));

  const inBoth = registry.filter((e) => mapKeys.has(eventKey(e))).length;

  let publicApiFetched: number | null = null;
  let publicApiVisible60: number | null = null;
  let blockedByPublicApi: CompareEventRow[] = [];

  if (options.anonKey) {
    const anon = createClient(options.supabaseUrl, options.anonKey);
    const { data: pubData, error: pubError } = await anon
      .from("events")
      .select("*")
      .eq("verified", true)
      .order("start_date", { ascending: true });

    if (pubError) throw new Error(`API pubblica (anon): ${pubError.message}`);

    const pub = ((pubData ?? []) as AtlasEvent[]).filter((e) => e.archived !== true);
    publicApiFetched = pub.length;
    publicApiVisible60 = pub.filter((e) => isEventVisibleInRange(e, range)).length;

    const pubKeys = new Set(pub.map(eventKey));
    blockedByPublicApi = mapVisible
      .filter((e) => !pubKeys.has(eventKey(e)))
      .map((e) =>
        toRow(
          e,
          "presente nel DB (service role) ma NON restituito dalla API pubblica — probabile blocco RLS",
        ),
      );
  }

  return {
    generatedAt: new Date().toISOString(),
    rangeDays: range,
    registryInPubblicazione: registry.length,
    mapVisible: mapVisible.length,
    inBoth,
    onlyRegistry,
    onlyMap,
    registryOutsideRange: onlyRegistry.filter((r) => r.reason?.includes("oltre")),
    registryInRangeButMissingOnMap: onlyRegistry.filter((r) =>
      r.reason?.includes("escluso") || r.reason?.includes("coordinate"),
    ),
    publicApiFetched,
    publicApiVisible60,
    blockedByPublicApi,
  };
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("it-IT");
}

function formatRows(title: string, rows: CompareEventRow[]): string[] {
  const lines = [title, "-".repeat(title.length)];
  if (rows.length === 0) {
    lines.push("(nessuno)");
    return lines;
  }
  for (const row of rows) {
    lines.push(
      `• ${row.title}`,
      `  Data: ${formatDateShort(row.start_date)} | Comune: ${row.comune} | Fonte: ${row.source_id}`,
      `  ID: ${row.id}${row.reason ? ` | Motivo: ${row.reason}` : ""}`,
    );
  }
  return lines;
}

export function formatCompareReport(report: CompareMapRegistryReport): string {
  const lines = [
    `=== Confronto Mappa (${report.rangeDays} giorni) vs Registro (in pubblicazione) ===`,
    `Generato: ${report.generatedAt}`,
    "",
    `Registro in pubblicazione:     ${report.registryInPubblicazione}`,
    `Mappa visibile (filtro ${report.rangeDays}g): ${report.mapVisible}`,
    `Presenti in entrambi:          ${report.inBoth}`,
    `Solo Registro:                 ${report.onlyRegistry.length}`,
    `  di cui oltre finestra ${report.rangeDays}g: ${report.registryOutsideRange.length}`,
    `  di cui nella finestra ma assenti dalla mappa: ${report.registryInRangeButMissingOnMap.length}`,
    `Solo Mappa:                    ${report.onlyMap.length}`,
    "",
  ];

  if (report.publicApiFetched !== null) {
    lines.push(
      "--- API pubblica (come la mappa utente con anon key) ---",
      `Eventi scaricati dalla mappa:  ${report.publicApiFetched}`,
      `Visibili con filtro ${report.rangeDays}g:     ${report.publicApiVisible60}`,
      `Bloccati da RLS (stimati):     ${report.blockedByPublicApi.length}`,
      "",
    );
  }

  lines.push(
    ...formatRows(
      `EVENTI IN REGISTRO MA NON SULLA MAPPA (${report.onlyRegistry.length})`,
      report.onlyRegistry,
    ),
    "",
    ...formatRows(`EVENTI SULLA MAPPA MA NON IN REGISTRO (${report.onlyMap.length})`, report.onlyMap),
    "",
    ...formatRows(
      `BLOCCATI API PUBBLICA / RLS (${report.blockedByPublicApi.length})`,
      report.blockedByPublicApi,
    ),
    "",
    ...formatRows(
      `ANOMALIE: in pubblicazione, nella finestra ${report.rangeDays}g, ma assenti dalla mappa (${report.registryInRangeButMissingOnMap.length})`,
      report.registryInRangeButMissingOnMap,
    ),
  );
  return lines.join("\n");
}
