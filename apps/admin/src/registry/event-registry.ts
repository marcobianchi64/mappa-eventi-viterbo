import {
  CATEGORY_META,
  escapeHtml,
  formatCompareReport,
  formatDate,
  getCategoryMeta,
  getEventLifecycle,
  hasValidEventCoords,
  isRegistryInPubblicazione,
  renderCompareSummaryHtml,
  type AtlasEvent,
  type AtlasSource,
  type CompareMapRegistryReport,
  type EventCategory,
} from "@atlas/core";
import { archiveEvent } from "@atlas/supabase-client";

export type RegistryVisibility =
  | "all"
  | "live"
  | "history"
  | "archived"
  | "pending"
  | "rejected";

export type RegistrySort =
  | "live_first"
  | "start_desc"
  | "start_asc"
  | "created_desc"
  | "title_asc";

export interface RegistryFilters {
  q: string;
  comune: string;
  province: string;
  territoryId: string;
  category: string;
  sourceId: string;
  visibility: RegistryVisibility;
  dateFrom: string;
  dateTo: string;
  sort: RegistrySort;
}

export type EventLifecycle = "live" | "past" | "pending" | "rejected" | "archived";

const LIFECYCLE_LABELS: Record<EventLifecycle, string> = {
  live: "In pubblicazione",
  past: "Passato",
  pending: "In revisione",
  rejected: "Rifiutato",
  archived: "Archiviato",
};

const VISIBILITY_LABELS: Record<RegistryVisibility, string> = {
  all: "Tutti",
  live: "In pubblicazione",
  history: "Storico (passati + archiviati)",
  archived: "Solo archiviati",
  pending: "In revisione",
  rejected: "Rifiutati",
};

export const DEFAULT_REGISTRY_FILTERS: RegistryFilters = {
  q: "",
  comune: "",
  province: "",
  territoryId: "",
  category: "",
  sourceId: "",
  visibility: "all",
  dateFrom: "",
  dateTo: "",
  sort: "live_first",
};

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function eventComune(event: AtlasEvent): string {
  return (event.comune ?? event.city ?? "").trim();
}

function eventProvince(event: AtlasEvent): string {
  return (event.province ?? "Viterbo").trim();
}

function matchesVisibility(event: AtlasEvent, visibility: RegistryVisibility): boolean {
  const lifecycle = getEventLifecycle(event);
  switch (visibility) {
    case "all":
      return true;
    case "live":
      return lifecycle === "live" && event.verified === true;
    case "history":
      return lifecycle === "past" || lifecycle === "archived";
    case "archived":
      return lifecycle === "archived";
    case "pending":
      return lifecycle === "pending";
    case "rejected":
      return lifecycle === "rejected";
    default:
      return true;
  }
}

function matchesDateRange(event: AtlasEvent, dateFrom: string, dateTo: string): boolean {
  const start = new Date(event.start_date);
  if (Number.isNaN(start.getTime())) return true;

  if (dateFrom) {
    const from = startOfDay(new Date(`${dateFrom}T00:00:00`));
    if (start < from) return false;
  }
  if (dateTo) {
    const to = new Date(`${dateTo}T23:59:59`);
    if (start > to) return false;
  }
  return true;
}

export function filterRegistryEvents(events: AtlasEvent[], filters: RegistryFilters): AtlasEvent[] {
  const q = filters.q.trim().toLowerCase();

  const filtered = events.filter((event) => {
    if (!matchesVisibility(event, filters.visibility)) return false;
    if (!matchesDateRange(event, filters.dateFrom, filters.dateTo)) return false;

    if (filters.comune && eventComune(event) !== filters.comune) return false;
    if (filters.province && eventProvince(event) !== filters.province) return false;
    if (filters.territoryId && (event.territory_id ?? "") !== filters.territoryId) return false;
    if (filters.category && event.category !== filters.category) return false;
    if (filters.sourceId && (event.source_id ?? "") !== filters.sourceId) return false;

    if (q) {
      const haystack = [
        event.title,
        event.venue,
        eventComune(event),
        event.location,
        event.description,
        event.event_url,
        event.date_event,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });

  return sortRegistryEvents(filtered, filters.sort);
}

function lifecycleSortRank(event: AtlasEvent): number {
  const lifecycle = getEventLifecycle(event);
  if (lifecycle === "live" && event.verified === true) return 0;
  if (lifecycle === "past") return 1;
  if (lifecycle === "pending") return 2;
  if (lifecycle === "rejected") return 3;
  if (lifecycle === "archived") return 4;
  return 5;
}

function sortRegistryEvents(events: AtlasEvent[], sort: RegistrySort): AtlasEvent[] {
  const copy = [...events];
  copy.sort((a, b) => {
    if (sort === "live_first") {
      const rankDiff = lifecycleSortRank(a) - lifecycleSortRank(b);
      if (rankDiff !== 0) return rankDiff;
      const sa = new Date(a.start_date).getTime();
      const sb = new Date(b.start_date).getTime();
      if (lifecycleSortRank(a) === 0) return sa - sb;
      if (lifecycleSortRank(a) === 1) return sb - sa;
      return sb - sa;
    }
    if (sort === "title_asc") return a.title.localeCompare(b.title, "it");
    if (sort === "created_desc") {
      const ca = new Date(a.created_at ?? 0).getTime();
      const cb = new Date(b.created_at ?? 0).getTime();
      return cb - ca;
    }
    const sa = new Date(a.start_date).getTime();
    const sb = new Date(b.start_date).getTime();
    return sort === "start_asc" ? sa - sb : sb - sa;
  });
  return copy;
}

export function countRegistryInPubblicazione(events: AtlasEvent[]): {
  total: number;
  withCoords: number;
  withoutCoords: number;
} {
  const live = events.filter(isRegistryInPubblicazione);
  const withCoords = live.filter(hasValidEventCoords).length;
  return {
    total: live.length,
    withCoords,
    withoutCoords: live.length - withCoords,
  };
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "it"));
}

function sourceName(sources: AtlasSource[], sourceId?: string | null): string {
  if (!sourceId) return "—";
  return sources.find((s) => s.id === sourceId)?.name ?? sourceId;
}

function lifecycleBadge(lifecycle: EventLifecycle): string {
  const colors: Record<EventLifecycle, string> = {
    live: "#15803d",
    past: "#6b7280",
    pending: "#d97706",
    rejected: "#b91c1c",
    archived: "#4b5563",
  };
  return `<span class="registry-badge" style="background:${colors[lifecycle]}">${LIFECYCLE_LABELS[lifecycle]}</span>`;
}

function formatShortDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return date.toLocaleDateString("it-IT");
}

export function renderRegistryPanelHtml(
  events: AtlasEvent[],
  sources: AtlasSource[],
  filters: RegistryFilters,
  compareReport?: CompareMapRegistryReport,
): string {
  const filtered = filterRegistryEvents(events, filters);
  const inPubblicazioneStats = countRegistryInPubblicazione(events);
  const inPubblicazioneInList = filtered.filter(isRegistryInPubblicazione).length;
  const comuni = uniqueSorted(events.map(eventComune));
  const provinces = uniqueSorted(events.map(eventProvince));
  const territories = uniqueSorted(events.map((e) => e.territory_id ?? ""));
  const categoryOptions = (Object.keys(CATEGORY_META) as EventCategory[])
    .map((key) => {
      const meta = getCategoryMeta(key);
      const selected = filters.category === key ? "selected" : "";
      return `<option value="${key}" ${selected}>${escapeHtml(meta.label)}</option>`;
    })
    .join("");

  let liveRowNumber = 0;
  const rows =
    filtered.length === 0
      ? `<tr><td colspan="9" class="registry-empty">Nessun evento corrisponde ai filtri.</td></tr>`
      : filtered
          .map((event) => {
            const lifecycle = getEventLifecycle(event);
            const inPubblicazione = isRegistryInPubblicazione(event);
            const rowNumber = inPubblicazione ? ++liveRowNumber : null;
            const meta = getCategoryMeta(event.category);
            const url = event.event_url ?? event.external_url;
            const numCell =
              rowNumber !== null
                ? `<td class="registry-num" title="In pubblicazione">${rowNumber}</td>`
                : `<td class="registry-num registry-num-muted">—</td>`;
            return `
        <tr data-id="${escapeHtml(event.date_event ?? "")}"${inPubblicazione ? ' class="registry-row-live"' : ""}>
          ${numCell}
          <td>${lifecycleBadge(lifecycle)}</td>
          <td class="registry-title">
            <strong>${escapeHtml(event.title)}</strong>
            ${event.venue ? `<div class="small">${escapeHtml(event.venue)}</div>` : ""}
          </td>
          <td>${formatShortDate(event.start_date)}</td>
          <td>${formatShortDate(event.end_date)}</td>
          <td>${escapeHtml(eventComune(event) || "—")}</td>
          <td>${escapeHtml(meta.label)}</td>
          <td class="small">${escapeHtml(sourceName(sources, event.source_id))}</td>
          <td class="registry-actions">
            <button type="button" class="btn-secondary registry-edit" data-id="${escapeHtml(event.date_event ?? "")}">Modifica</button>
            ${url ? `<a class="link-btn btn-secondary" href="${escapeHtml(url)}" target="_blank" rel="noopener">Link</a>` : ""}
            ${!event.archived ? `<button type="button" class="reject registry-archive" data-id="${escapeHtml(event.date_event ?? "")}">Archivia</button>` : ""}
          </td>
        </tr>`;
          })
          .join("");

  return `
    <h2>Registro eventi</h2>
    <p class="small">Consultazione completa: eventi in pubblicazione, passati, archiviati e in revisione. Usa i filtri per provincia, comune, date, categoria, fonte e stato.</p>

    ${compareReport ? renderCompareSummaryHtml(compareReport) : ""}

    <div class="registry-summary">
      <span><strong>${filtered.length}</strong> mostrati su <strong>${events.length}</strong> totali</span>
      <span class="registry-summary-pub">In pubblicazione: <strong>${inPubblicazioneStats.total}</strong> nel database · <strong>${inPubblicazioneInList}</strong> numerati in tabella (1–${inPubblicazioneInList || 0})${inPubblicazioneStats.withoutCoords > 0 ? ` · <strong>${inPubblicazioneStats.withoutCoords}</strong> senza coordinate (senza pin)` : ""}</span>
      <button type="button" class="btn-secondary" id="registryExportCsv">Esporta CSV</button>
      <button type="button" class="btn-secondary" id="registryResetFilters">Azzera filtri</button>
    </div>

    <form id="registryFilters" class="registry-filters">
      <label>
        Cerca
        <input name="q" type="search" placeholder="Titolo, luogo, comune..." value="${escapeHtml(filters.q)}" />
      </label>
      <label>
        Stato
        <select name="visibility">
          ${Object.entries(VISIBILITY_LABELS)
            .map(
              ([value, label]) =>
                `<option value="${value}" ${filters.visibility === value ? "selected" : ""}>${label}</option>`,
            )
            .join("")}
        </select>
      </label>
      <label>
        Provincia
        <select name="province">
          <option value="">Tutte</option>
          ${provinces.map((p) => `<option value="${escapeHtml(p)}" ${filters.province === p ? "selected" : ""}>${escapeHtml(p)}</option>`).join("")}
        </select>
      </label>
      <label>
        Comune
        <select name="comune">
          <option value="">Tutti</option>
          ${comuni.map((c) => `<option value="${escapeHtml(c)}" ${filters.comune === c ? "selected" : ""}>${escapeHtml(c)}</option>`).join("")}
        </select>
      </label>
      <label>
        Territorio
        <select name="territoryId">
          <option value="">Tutti</option>
          ${territories.map((t) => `<option value="${escapeHtml(t)}" ${filters.territoryId === t ? "selected" : ""}>${escapeHtml(t)}</option>`).join("")}
        </select>
      </label>
      <label>
        Categoria
        <select name="category">
          <option value="">Tutte</option>
          ${categoryOptions}
        </select>
      </label>
      <label>
        Fonte
        <select name="sourceId">
          <option value="">Tutte</option>
          ${sources.map((s) => `<option value="${escapeHtml(s.id)}" ${filters.sourceId === s.id ? "selected" : ""}>${escapeHtml(s.name)}</option>`).join("")}
        </select>
      </label>
      <label>
        Data da
        <input name="dateFrom" type="date" value="${escapeHtml(filters.dateFrom)}" />
      </label>
      <label>
        Data a
        <input name="dateTo" type="date" value="${escapeHtml(filters.dateTo)}" />
      </label>
      <label>
        Ordina
        <select name="sort">
          <option value="live_first" ${filters.sort === "live_first" ? "selected" : ""}>In pubblicazione prima, poi passati</option>
          <option value="start_desc" ${filters.sort === "start_desc" ? "selected" : ""}>Data evento (recenti prima)</option>
          <option value="start_asc" ${filters.sort === "start_asc" ? "selected" : ""}>Data evento (prossimi prima)</option>
          <option value="created_desc" ${filters.sort === "created_desc" ? "selected" : ""}>Inserimento (recenti prima)</option>
          <option value="title_asc" ${filters.sort === "title_asc" ? "selected" : ""}>Titolo A-Z</option>
        </select>
      </label>
    </form>

    <div class="registry-table-wrap">
      <table class="registry-table">
        <thead>
          <tr>
            <th class="registry-num-col" title="Solo righe in pubblicazione">#</th>
            <th>Stato</th>
            <th>Evento</th>
            <th>Inizio</th>
            <th>Fine</th>
            <th>Comune</th>
            <th>Categoria</th>
            <th>Fonte</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="small registry-footnote">Ultimo aggiornamento registro: ${formatDate(new Date().toISOString())}</p>
  `;
}

export function readRegistryFilters(form: HTMLFormElement): RegistryFilters {
  const data = new FormData(form);
  return {
    q: String(data.get("q") ?? ""),
    comune: String(data.get("comune") ?? ""),
    province: String(data.get("province") ?? ""),
    territoryId: String(data.get("territoryId") ?? ""),
    category: String(data.get("category") ?? ""),
    sourceId: String(data.get("sourceId") ?? ""),
    visibility: (String(data.get("visibility") ?? "all") || "all") as RegistryVisibility,
    dateFrom: String(data.get("dateFrom") ?? ""),
    dateTo: String(data.get("dateTo") ?? ""),
    sort: (String(data.get("sort") ?? "live_first") || "live_first") as RegistrySort,
  };
}

export function exportRegistryCsv(events: AtlasEvent[], sources: AtlasSource[]): void {
  const header = [
    "stato",
    "titolo",
    "data_inizio",
    "data_fine",
    "comune",
    "provincia",
    "categoria",
    "fonte",
    "luogo",
    "url",
    "verificato",
    "revisione",
    "archiviato",
    "id",
  ];
  const lines = [header.join(";")];

  for (const event of events) {
    const lifecycle = LIFECYCLE_LABELS[getEventLifecycle(event)];
    const row = [
      lifecycle,
      event.title,
      formatShortDate(event.start_date),
      formatShortDate(event.end_date),
      eventComune(event),
      eventProvince(event),
      getCategoryMeta(event.category).label,
      sourceName(sources, event.source_id),
      event.venue ?? "",
      event.event_url ?? event.external_url ?? "",
      event.verified ? "sì" : "no",
      event.review_status,
      event.archived ? "sì" : "no",
      event.date_event ?? "",
    ].map((cell) => `"${String(cell).replace(/"/g, '""')}"`);
    lines.push(row.join(";"));
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `atlas-registro-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export interface RegistryBindings {
  events: AtlasEvent[];
  sources: AtlasSource[];
  filters: RegistryFilters;
  compareReport?: CompareMapRegistryReport;
  onFiltersChange: (filters: RegistryFilters) => void;
  onEditEvent: (eventId: string) => void;
  onArchived: () => void;
}

export function bindRegistryPanel(panel: HTMLElement, bindings: RegistryBindings): void {
  const form = panel.querySelector("#registryFilters") as HTMLFormElement | null;
  form?.addEventListener("input", () => {
    bindings.onFiltersChange(readRegistryFilters(form));
  });
  form?.addEventListener("change", () => {
    bindings.onFiltersChange(readRegistryFilters(form));
  });

  panel.querySelector("#registryResetFilters")?.addEventListener("click", () => {
    bindings.onFiltersChange({ ...DEFAULT_REGISTRY_FILTERS });
  });

  panel.querySelector("#registryExportCsv")?.addEventListener("click", () => {
    const filtered = filterRegistryEvents(bindings.events, bindings.filters);
    exportRegistryCsv(filtered, bindings.sources);
  });

  panel.querySelector("#registryCopyCompare")?.addEventListener("click", async () => {
    if (!bindings.compareReport) return;
    const text = formatCompareReport(bindings.compareReport);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt("Copia il report:", text);
    }
  });

  panel.querySelectorAll(".registry-edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = (btn as HTMLButtonElement).dataset.id;
      if (id) bindings.onEditEvent(id);
    });
  });

  panel.querySelectorAll(".registry-archive").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = (btn as HTMLButtonElement).dataset.id;
      if (!id) return;
      const event = bindings.events.find((e) => e.date_event === id);
      const ok = window.confirm(`Archiviare «${event?.title ?? "evento"}»? Non sarà più visibile sulla mappa.`);
      if (!ok) return;
      void archiveEvent(id).then(() => bindings.onArchived());
    });
  });
}
