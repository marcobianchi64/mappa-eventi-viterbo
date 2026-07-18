import {
  escapeHtml,
  eventsLookSimilar,
  loadDiscoverySession,
  MANUAL_DISCOVERY_SOURCE_ID,
  parseMarkdownTables,
  registerDiscoveryBlock,
  type AtlasEvent,
  type DiscoveryRow,
  type EventCategory,
} from "@atlas/core";
import { createEventAdmin } from "@atlas/supabase-client";

export interface ProcessedDiscoveryRow {
  row: DiscoveryRow;
  status: "ready" | "duplicate" | "past" | "invalid";
  reason?: string;
}

export function processDiscoveryPaste(
  text: string,
  existing: AtlasEvent[],
): { rows: ProcessedDiscoveryRow[]; session: ReturnType<typeof registerDiscoveryBlock> } {
  const session = registerDiscoveryBlock();
  const parsed = parseMarkdownTables(text);
  const rows = parsed.map((row) => classifyRow(row, existing));
  return { rows, session };
}

function classifyRow(row: DiscoveryRow, existing: AtlasEvent[]): ProcessedDiscoveryRow {
  const title = row.titolo?.trim();
  if (!title) return { row, status: "invalid", reason: "Titolo mancante" };

  const start = parseDate(row.data_inizio ?? "", row.orario);
  if (!start) return { row, status: "invalid", reason: "Data non valida" };
  if (start.getTime() < Date.now() - 86400000) return { row, status: "past", reason: "Evento passato" };

  const venue = row.luogo?.trim() || null;
  const duplicate = existing.find((e) => {
    if (row.url_evento && e.event_url === row.url_evento) return true;
    return eventsLookSimilar(
      { title, start_date: start.toISOString(), venue, lat: e.lat, lng: e.lng },
      { title: e.title, start_date: e.start_date, venue: e.venue, lat: e.lat, lng: e.lng },
    );
  });
  if (duplicate) return { row, status: "duplicate", reason: `Già presente: ${duplicate.title}` };

  return { row, status: "ready" };
}

export async function publishDiscoveryRows(rows: ProcessedDiscoveryRow[]): Promise<number> {
  let count = 0;
  for (const item of rows) {
    if (item.status !== "ready") continue;
    const row = item.row;
    const start = parseDate(row.data_inizio!, row.orario);
    if (!start) continue;
    const end = row.data_fine ? parseDate(row.data_fine, row.orario) : null;

    await createEventAdmin({
      title: row.titolo.trim(),
      category: mapCategory(row.categoria),
      start_date: start.toISOString(),
      end_date: end?.toISOString() ?? null,
      venue: row.luogo?.trim() || null,
      city: row.comune?.trim() || null,
      comune: row.comune?.trim() || null,
      event_url: row.url_evento?.trim() || null,
      description: [row.organizzatore, row.note, row.url_fonte ? `Fonte: ${row.url_fonte}` : ""]
        .filter(Boolean)
        .join("\n"),
      lat: 42.4207,
      lng: 12.1042,
      source_id: MANUAL_DISCOVERY_SOURCE_ID,
      territory_id: "IT-VT",
      verified: true,
      review_status: "approved",
    });
    count += 1;
  }
  return count;
}

export function renderDiscoveryPanelHtml(session: ReturnType<typeof loadDiscoverySession>): string {
  return `
    <div class="session-bar">
      <span>Sessione: <strong>${escapeHtml(session.sessionDate)}</strong></span>
      <span>Blocchi incollati: <strong id="blockCount">${session.blockCount}</strong></span>
    </div>
    <h2>Scoperta eventi</h2>
    <p class="small">Incolla qui il risultato dei prompt AI (tabella markdown). Il sistema scarta automaticamente duplicati e date passate.</p>
    <textarea id="discoveryPaste" rows="10" placeholder="Incolla tabella markdown da Google AI..."></textarea>
    <button type="button" class="primary" id="processDiscovery">Elabora blocco</button>
    <div id="discoveryResults"></div>
  `;
}

export function renderDiscoveryResults(rows: ProcessedDiscoveryRow[]): string {
  if (rows.length === 0) return "<p>Nessuna riga riconosciuta. Verifica il formato tabella.</p>";

  const groups = {
    ready: rows.filter((r) => r.status === "ready"),
    duplicate: rows.filter((r) => r.status === "duplicate"),
    past: rows.filter((r) => r.status === "past"),
    invalid: rows.filter((r) => r.status === "invalid"),
  };

  let html = `<p><strong>${groups.ready.length}</strong> pronti · ${groups.duplicate.length} duplicati · ${groups.past.length} passati · ${groups.invalid.length} non validi</p>`;

  if (groups.ready.length) {
    html += `<button type="button" class="primary approve" id="publishDiscovery">Pubblica ${groups.ready.length} eventi</button>`;
    html += '<ul class="discovery-list">';
    for (const item of groups.ready) {
      html += `<li>✅ ${escapeHtml(item.row.titolo)} — ${escapeHtml(item.row.comune ?? "")} · ${escapeHtml(item.row.data_inizio ?? "")}</li>`;
    }
    html += "</ul>";
  }

  for (const item of [...groups.duplicate, ...groups.past, ...groups.invalid]) {
    html += `<div class="small">❌ ${escapeHtml(item.row.titolo || "?")} — ${escapeHtml(item.reason ?? item.status)}</div>`;
  }

  return html;
}

function parseDate(value: string, orario?: string): Date | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const dmy = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (dmy) {
    const date = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]), 19, 0);
    const t = orario?.match(/^(\d{1,2}):(\d{2})$/);
    if (t) date.setHours(Number(t[1]), Number(t[2]));
    return date;
  }
  const iso = Date.parse(trimmed);
  return Number.isNaN(iso) ? null : new Date(iso);
}

function mapCategory(raw?: string): EventCategory {
  const v = (raw ?? "other").toLowerCase();
  const map: Record<string, EventCategory> = {
    music: "music",
    musica: "music",
    food: "food",
    enogastronomia: "food",
    culture: "culture",
    cultura: "culture",
    sport: "sport",
    families: "families",
    famiglie: "families",
    other: "other",
  };
  return map[v] ?? "other";
}
