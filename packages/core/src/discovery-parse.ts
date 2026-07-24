import { sanitizeDiscoveryCell } from "./discovery-normalize.js";

export interface DiscoveryRow {
  stato?: string;
  organizzatore?: string;
  titolo: string;
  comune?: string;
  luogo?: string;
  data_inizio?: string;
  data_fine?: string;
  orario?: string;
  url_evento?: string;
  url_fonte?: string;
  tipo_fonte?: string;
  categoria?: string;
  note?: string;
}

const HEADER_ALIASES: Record<string, keyof DiscoveryRow> = {
  stato: "stato",
  organizzatore: "organizzatore",
  titolo: "titolo",
  comune: "comune",
  luogo: "luogo",
  data_inizio: "data_inizio",
  data_fine: "data_fine",
  orario: "orario",
  url_evento: "url_evento",
  url_fonte: "url_fonte",
  tipo_fonte: "tipo_fonte",
  categoria: "categoria",
  note: "note",
};

export function parseMarkdownTables(text: string): DiscoveryRow[] {
  const lines = text.split(/\r?\n/);
  const rows: DiscoveryRow[] = [];
  let headers: (keyof DiscoveryRow)[] | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.includes("|")) continue;
    if (/^\[\d+\]:/.test(trimmed)) continue;
    if (/^\|?[\s\-:|]+\|?$/.test(trimmed.replace(/\|/g, "").trim())) continue;

    const cells = trimmed
      .split("|")
      .map((c) => sanitizeDiscoveryCell(c.trim()))
      .filter((_, i, arr) => !(i === 0 && arr[0] === "") && !(i === arr.length - 1 && arr[arr.length - 1] === ""));

    if (!headers) {
      const mapped = cells.map(normalizeHeader).filter((h): h is keyof DiscoveryRow => h !== null);
      if (mapped.includes("titolo")) {
        headers = mapped;
      }
      continue;
    }

    if (cells.length < 3) continue;
    const maybeHeader = cells.every((c) => normalizeHeader(c) !== null);
    if (maybeHeader && cells.map(normalizeHeader).includes("titolo")) continue;

    const record: Partial<DiscoveryRow> = {};
    headers.forEach((key, i) => {
      const value = cells[i]?.trim();
      if (value) record[key] = value;
    });

    if (record.titolo?.trim()) rows.push(record as DiscoveryRow);
  }

  return rows;
}

/** Prova markdown, TSV (Fogli), CSV ; e testo incollato da Google senza separatori */
export function parseDiscoveryText(text: string): DiscoveryRow[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const md = parseMarkdownTables(trimmed);
  if (md.length) return md;

  const tsv = parseDelimitedTable(trimmed, "\t");
  if (tsv.length) return tsv;

  const csv = parseDelimitedTable(trimmed, ";");
  if (csv.length) return csv;

  return parseGluedGoogleText(trimmed);
}

function parseDelimitedTable(text: string, delimiter: string): DiscoveryRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().includes(delimiter));
  if (lines.length < 2) return [];

  const headerCells = lines[0].split(delimiter).map((c) => c.trim());
  const headers = headerCells.map(normalizeHeader).filter((h): h is keyof DiscoveryRow => h !== null);
  if (headers.length < 3) return [];

  const rows: DiscoveryRow[] = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(delimiter).map((c) => c.trim());
    const record: Partial<DiscoveryRow> = {};
    headers.forEach((key, i) => {
      if (cells[i]) record[key] = sanitizeDiscoveryCell(cells[i]);
    });
    if (record.titolo?.trim()) rows.push(record as DiscoveryRow);
  }
  return rows;
}

const CATEGORY_WORDS =
  /\b(food|enogastronomia|music|musica|culture|cultura|sport|families|famiglie|other|altro|manifestazioni|manifestazione|sagra|sagre)\b/i;

/** Testo Google incollato senza | o ; — euristica su date e parole chiave */
function parseGluedGoogleText(text: string): DiscoveryRow[] {
  let body = text.replace(/^stato\s*organizzatore/i, "").replace(/^statoorganizzatore/i, "");
  body = body.replace(/^titolo.*?note/i, "");

  const chunks = body.split(/(?=(?:Associazione |Comitato |Pro Loco |Comune di ))/i).filter((c) => c.trim().length > 20);
  const rows: DiscoveryRow[] = [];

  for (const chunk of chunks) {
    const dates = [...chunk.matchAll(/(\d{2}\/\d{2}\/\d{4})/g)].map((m) => m[1]);
    if (dates.length < 1) continue;

    const dateIdx = chunk.indexOf(dates[0]);
    const before = chunk.slice(0, dateIdx).trim();
    const after = chunk.slice(dateIdx);

    const orarioMatch = after.match(/(Dalle \d{1,2}:\d{2}|Serale|Tutto il giorno)/i);
    const catMatch = after.match(CATEGORY_WORDS);
    const catIdx = catMatch?.index ?? -1;

    let note = "";
    if (catIdx >= 0 && catMatch) {
      note = after.slice(catIdx + catMatch[0].length).trim();
    }

    const titoloMatch = before.match(
      /(L['']estate a [^0-9]+|Sagra [^0-9]+|Festa [^0-9]+|Festeggiamenti [^0-9]+|Concerto [^0-9]+|^\d+[^0-9]*Festa [^0-9]+)/i,
    );
    const titolo = titoloMatch ? titoloMatch[0].trim() : before.slice(-40).trim();

    let organizzatore = "";
    let comune = "";
    let luogo = "";
    if (titoloMatch && titoloMatch.index !== undefined) {
      organizzatore = before.slice(0, titoloMatch.index).trim();
      const mid = before.slice(titoloMatch.index + titolo.length).trim();
      const paren = mid.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
      if (paren) {
        comune = paren[1].trim();
        luogo = paren[2].trim();
      } else {
        const parts = mid.split(/\s+(?=[A-ZÀ-Ú])/);
        comune = parts[0] ?? "";
        luogo = parts.slice(1).join(" ") || mid;
      }
    }

    rows.push({
      titolo: titolo || "Evento",
      organizzatore: organizzatore || undefined,
      comune: comune || undefined,
      luogo: luogo || undefined,
      data_inizio: dates[0],
      data_fine: dates[1],
      orario: orarioMatch?.[1],
      categoria: catMatch?.[1],
      note: note || undefined,
    });
  }

  return rows;
}

function normalizeHeader(value: string): keyof DiscoveryRow | null {
  const key = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w]/g, "");
  return key in HEADER_ALIASES ? HEADER_ALIASES[key] : null;
}

export interface DiscoverySessionMeta {
  sessionDate: string;
  blockCount: number;
  lastUpdated: string;
}

const SESSION_KEY = "atlas_discovery_session";

export function loadDiscoverySession(): DiscoverySessionMeta {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw) as DiscoverySessionMeta;
  } catch {
    /* ignore */
  }
  return {
    sessionDate: new Date().toISOString().slice(0, 10),
    blockCount: 0,
    lastUpdated: new Date().toISOString(),
  };
}

export function registerDiscoveryBlock(): DiscoverySessionMeta {
  const current = loadDiscoverySession();
  const today = new Date().toISOString().slice(0, 10);
  const session: DiscoverySessionMeta = {
    sessionDate: today,
    blockCount: current.sessionDate === today ? current.blockCount + 1 : 1,
    lastUpdated: new Date().toISOString(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}
