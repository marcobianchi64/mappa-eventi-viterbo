import {
  escapeHtml,
  discoveryEventExternalId,
  countDiscoveryDataRowsInPaste,
  eventsAreDiscoveryDuplicates,
  formatComuneLabel,
  geocodeComuneViterbo,
  inferComuneFromText,
  loadDiscoverySession,
  MANUAL_DISCOVERY_SOURCE_ID,
  parseDiscoveryDateTime,
  parseDiscoveryText,
  registerDiscoveryBlock,
  resolveEventCategory,
  type AtlasEvent,
  type DiscoveryRow,
  type DuplicateComparableEvent,
} from "@atlas/core";
import { createEventAdmin } from "@atlas/supabase-client";

export interface ProcessedDiscoveryRow {
  row: DiscoveryRow;
  status: "ready" | "duplicate" | "past" | "invalid";
  reason?: string;
}

export interface DiscoveryPasteAudit {
  dataRowsInPaste: number;
  parsedCount: number;
}

export function processDiscoveryPaste(
  text: string,
  existing: AtlasEvent[],
): {
  rows: ProcessedDiscoveryRow[];
  session: ReturnType<typeof loadDiscoverySession>;
  audit: DiscoveryPasteAudit;
} {
  const audit: DiscoveryPasteAudit = {
    dataRowsInPaste: countDiscoveryDataRowsInPaste(text),
    parsedCount: 0,
  };
  const parsed = parseDiscoveryText(text);
  audit.parsedCount = parsed.length;
  const rows: ProcessedDiscoveryRow[] = [];
  const acceptedInBatch: DuplicateComparableEvent[] = [];

  for (const row of parsed) {
    const classified = classifyRow(row, [...existing, ...acceptedInBatch]);
    rows.push(classified);
    if (classified.status === "ready") {
      acceptedInBatch.push(toComparableEvent(row));
    }
  }

  const session = rows.length > 0 ? registerDiscoveryBlock() : loadDiscoverySession();
  return { rows, session, audit };
}

function toComparableEvent(row: DiscoveryRow): DuplicateComparableEvent {
  const start = parseDiscoveryDateTime(row.data_inizio ?? "", row.orario)!;
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

function classifyRow(
  row: DiscoveryRow,
  existing: (AtlasEvent | DuplicateComparableEvent)[],
): ProcessedDiscoveryRow {
  const title = row.titolo?.trim();
  if (!title) return { row, status: "invalid", reason: "Titolo mancante" };

  const start = parseDiscoveryDateTime(row.data_inizio ?? "", row.orario);
  if (!start) return { row, status: "invalid", reason: "Data non valida" };
  if (start.getTime() < Date.now() - 86400000) return { row, status: "past", reason: "Evento passato" };

  const candidate = toComparableEvent(row);
  const comuneKey =
    inferComuneFromText(row.comune, row.luogo, row.titolo) ??
    (row.comune?.trim() ? row.comune.trim().toLowerCase() : null);
  const comune = comuneKey ? formatComuneLabel(comuneKey) : row.comune?.trim() || "";
  const externalId = discoveryEventExternalId(title, start.toISOString(), comune);

  const duplicate = existing.find((e) => {
    const ext = (e as AtlasEvent).external_id;
    if (ext && ext === externalId) return true;
    const existingComparable: DuplicateComparableEvent = {
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
    return eventsAreDiscoveryDuplicates(candidate, existingComparable);
  });
  if (duplicate) return { row, status: "duplicate", reason: `Già presente: ${duplicate.title}` };

  return { row, status: "ready" };
}

export interface PublishDiscoveryResult {
  published: number;
  failed: { title: string; error: string }[];
}

export async function publishDiscoveryRows(rows: ProcessedDiscoveryRow[]): Promise<PublishDiscoveryResult> {
  const result: PublishDiscoveryResult = { published: 0, failed: [] };
  for (const item of rows) {
    if (item.status !== "ready") continue;
    const row = item.row;
    const start = parseDiscoveryDateTime(row.data_inizio!, row.orario);
    if (!start) {
      result.failed.push({ title: row.titolo, error: "Data non valida" });
      continue;
    }
    const end = row.data_fine ? parseDiscoveryDateTime(row.data_fine, row.orario) : null;

    const comuneKey =
      inferComuneFromText(row.comune, row.luogo, row.titolo) ??
      (row.comune?.trim() ? row.comune.trim().toLowerCase() : null);
    const comune = comuneKey ? formatComuneLabel(comuneKey) : row.comune?.trim() || null;
    const coords = geocodeComuneViterbo(comuneKey ?? comune);
    const externalId = discoveryEventExternalId(row.titolo.trim(), start.toISOString(), comune ?? "");

    try {
      await createEventAdmin({
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
      });
      result.published += 1;
    } catch (error) {
      result.failed.push({ title: row.titolo, error: (error as Error).message });
    }
  }
  return result;
}

export function renderDiscoveryPanelHtml(session: ReturnType<typeof loadDiscoverySession>): string {
  return `
    <div class="session-bar">
      <span>Sessione: <strong>${escapeHtml(session.sessionDate)}</strong></span>
      <span>Blocchi incollati: <strong id="blockCount">${session.blockCount}</strong></span>
    </div>
    <h2>Scoperta eventi</h2>
    <p class="small">Incolla la tabella (righe con <code>|</code>). Le righe <code>[1]: https://…</code> in calce vengono <strong>ignorate automaticamente</strong>. Dopo «Elabora» controlla: <strong>righe nel testo = righe lette</strong> (es. 27 = 27). Se non coincidono, salva in un file <code>.md</code> e usa <code>npm run import:discovery</code>.</p>
    <textarea id="discoveryPaste" rows="12" placeholder="stato | titolo | comune | data_inizio | url_evento | ..."></textarea>
    <div class="discovery-actions">
      <button type="button" class="primary" id="processDiscovery">Elabora blocco</button>
      <button type="button" class="btn-secondary" id="clearDiscovery" type="button">Svuota campo</button>
      <button type="button" class="btn-secondary" id="newDiscoveryBlock" type="button">Nuovo blocco</button>
    </div>
    <div id="discoveryResults"></div>
  `;
}

export function renderDiscoveryResults(
  rows: ProcessedDiscoveryRow[],
  audit?: DiscoveryPasteAudit,
): string {
  if (rows.length === 0) {
    const hint =
      audit && audit.dataRowsInPaste > 0
        ? `<p class="error">Nel testo ci sono circa <strong>${audit.dataRowsInPaste}</strong> righe dati, ma il parser ne ha lette <strong>0</strong>. Probabile tabella troncata o senza <code>|</code>. Usa <code>npm run import:discovery -- percorso/file.md</code>.</p>`
        : "";
    return `${hint}<p class="error">Nessuna riga riconosciuta.</p>
      <p class="small">Copia la <strong>tabella</strong> da ChatGPT (righe con <code>|</code>).
      Clicca <strong>Svuota campo</strong>, incolla un solo blocco, poi <strong>Elabora</strong>.</p>`;
  }

  const groups = {
    ready: rows.filter((r) => r.status === "ready"),
    duplicate: rows.filter((r) => r.status === "duplicate"),
    past: rows.filter((r) => r.status === "past"),
    invalid: rows.filter((r) => r.status === "invalid"),
  };

  let html = "";
  if (audit) {
    html += `<p>Righe dati nel testo: <strong>${audit.dataRowsInPaste}</strong> · Lette dal parser: <strong>${audit.parsedCount}</strong></p>`;
    if (audit.dataRowsInPaste > audit.parsedCount + 1) {
      html += `<p class="error"><strong>Attenzione:</strong> il testo contiene più righe di quelle lette. L’incolla è probabilmente incompleto: salva la tabella in un file e usa <code>npm run import:discovery</code>.</p>`;
    } else if (audit.dataRowsInPaste > 0 && audit.dataRowsInPaste === audit.parsedCount) {
      html += `<p class="success">Tabella letta per intero (${audit.parsedCount} eventi).</p>`;
    }
  }

  html += `<p><strong>${rows.length}</strong> righe elaborate · <strong>${groups.ready.length}</strong> pronti · ${groups.duplicate.length} duplicati · ${groups.past.length} passati · ${groups.invalid.length} non validi</p>`;

  const byComune = (status: ProcessedDiscoveryRow["status"]) => {
    const m = new Map<string, number>();
    for (const item of rows.filter((r) => r.status === status)) {
      const c = (item.row.comune ?? "?").trim();
      m.set(c, (m.get(c) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const readyComuni = byComune("ready");
  if (readyComuni.length) {
    html += `<p class="small"><strong>Pronti per comune:</strong> ${readyComuni.map(([c, n]) => `${escapeHtml(c)} (${n})`).join(" · ")}</p>`;
  }
  const dupComuni = byComune("duplicate");
  if (dupComuni.length) {
    html += `<p class="small"><strong>Già in DB (duplicati):</strong> ${dupComuni.map(([c, n]) => `${escapeHtml(c)} (${n})`).join(" · ")}</p>`;
  }

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
