import type { AtlasEvent, DateRangeKey } from "./types/event.js";
import {
  buildMapMarkerPlacements,
  escapeHtml,
  isEventVisibleInRange,
  isRegistryInPubblicazione,
} from "./utils.js";

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
  publicApiFetched: number | null;
  publicApiVisible60: number | null;
  blockedByPublicApi: CompareEventRow[];
  registryInRange: number;
  mapPinCount: number;
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

export function compareMapRegistryFromEvents(
  allEvents: AtlasEvent[],
  options?: { rangeDays?: DateRangeKey; publicEvents?: AtlasEvent[] },
): CompareMapRegistryReport {
  const range = options?.rangeDays ?? "60";
  const registry = allEvents.filter(isRegistryInPubblicazione);
  const registryInRange = registry.filter((e) => isEventVisibleInRange(e, range));
  const mapVisible = allEvents.filter((e) => isEventVisibleInRange(e, range));
  const mapPinCount = buildMapMarkerPlacements(mapVisible).length;

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

  if (options?.publicEvents) {
    const pub = options.publicEvents;
    publicApiFetched = pub.length;
    publicApiVisible60 = pub.filter((e) => isEventVisibleInRange(e, range)).length;

    const pubKeys = new Set(pub.map(eventKey));
    blockedByPublicApi = mapVisible
      .filter((e) => !pubKeys.has(eventKey(e)))
      .map((e) =>
        toRow(
          e,
          "presente nel DB ma NON restituito dalla API pubblica — probabile blocco RLS",
        ),
      );
  }

  return {
    generatedAt: new Date().toISOString(),
    rangeDays: range,
    registryInPubblicazione: registry.length,
    registryInRange: registryInRange.length,
    mapVisible: mapVisible.length,
    mapPinCount,
    inBoth,
    onlyRegistry,
    onlyMap,
    registryOutsideRange: onlyRegistry.filter((r) => r.reason?.includes("oltre")),
    registryInRangeButMissingOnMap: onlyRegistry.filter(
      (r) => r.reason?.includes("escluso") || r.reason?.includes("coordinate"),
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
    `  di cui nei prossimi ${report.rangeDays}g:    ${report.registryInRange}`,
    `Mappa visibile (filtro ${report.rangeDays}g): ${report.mapVisible}`,
    `Pin sulla mappa (unici):       ${report.mapPinCount}`,
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

export function renderCompareSummaryHtml(report: CompareMapRegistryReport): string {
  const ok =
    report.registryInRangeButMissingOnMap.length === 0 &&
    report.blockedByPublicApi.length === 0 &&
    report.onlyMap.length === 0;
  const statusClass = ok ? "registry-compare-ok" : "registry-compare-warn";
  const statusLabel = ok ? "Allineato" : "Differenze rilevate";

  const anomalyRows = report.registryInRangeButMissingOnMap
    .map(
      (row) =>
        `<li><strong>${escapeHtml(row.title)}</strong> — ${escapeHtml(row.comune)} (${formatDateShort(row.start_date)})<br><span class="small">${escapeHtml(row.reason ?? "")}</span></li>`,
    )
    .join("");

  const outsideRows = report.registryOutsideRange
    .map(
      (row) =>
        `<li>${escapeHtml(row.title)} — ${escapeHtml(row.comune)} (${formatDateShort(row.start_date)})</li>`,
    )
    .join("");

  const rlsRows = report.blockedByPublicApi
    .map(
      (row) =>
        `<li><strong>${escapeHtml(row.title)}</strong> — ${escapeHtml(row.comune)} (${formatDateShort(row.start_date)})</li>`,
    )
    .join("");

  return `
    <div class="registry-compare ${statusClass}">
      <div class="registry-compare-head">
        <strong>Confronto Registro ↔ Mappa (${report.rangeDays} giorni)</strong>
        <span class="registry-compare-badge">${statusLabel}</span>
      </div>
      <div class="registry-compare-grid">
        <div><span class="small">In pubblicazione (registro)</span><strong>${report.registryInPubblicazione}</strong></div>
        <div><span class="small">Nei prossimi ${report.rangeDays}g</span><strong>${report.registryInRange}</strong></div>
        <div><span class="small">Eventi mappa (${report.rangeDays}g)</span><strong>${report.mapVisible}</strong></div>
        <div><span class="small">Pin unici mappa</span><strong>${report.mapPinCount}</strong></div>
        <div><span class="small">API pubblica caricati</span><strong>${report.publicApiFetched ?? "—"}</strong></div>
        <div><span class="small">API pubblica (${report.rangeDays}g)</span><strong>${report.publicApiVisible60 ?? "—"}</strong></div>
      </div>
      ${
        report.registryInRangeButMissingOnMap.length > 0
          ? `<details class="registry-compare-details"><summary>Anomalie (${report.registryInRangeButMissingOnMap.length}) — in pubblicazione ma assenti dalla mappa</summary><ul>${anomalyRows}</ul></details>`
          : ""
      }
      ${
        report.blockedByPublicApi.length > 0
          ? `<details class="registry-compare-details"><summary>Bloccati RLS (${report.blockedByPublicApi.length})</summary><ul>${rlsRows}</ul></details>`
          : ""
      }
      ${
        report.registryOutsideRange.length > 0
          ? `<details class="registry-compare-details"><summary>Solo registro, oltre ${report.rangeDays}g (${report.registryOutsideRange.length}) — normale, non compaiono sulla mappa</summary><ul>${outsideRows}</ul></details>`
          : ""
      }
      <button type="button" class="btn-secondary" id="registryCopyCompare">Copia report testo</button>
    </div>
  `;
}
