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
    if (/^\|?[\s\-:|]+\|?$/.test(trimmed.replace(/\|/g, "").trim())) continue;

    const cells = trimmed
      .split("|")
      .map((c) => c.trim())
      .filter((_, i, arr) => !(i === 0 && arr[0] === "") && !(i === arr.length - 1 && arr[arr.length - 1] === ""));

    if (!headers) {
      headers = cells.map(normalizeHeader).filter((h): h is keyof DiscoveryRow => h !== null);
      if (headers.length < 3) headers = null;
      continue;
    }

    const record: Partial<DiscoveryRow> = {};
    headers.forEach((key, i) => {
      const value = cells[i]?.trim();
      if (value) record[key] = value;
    });

    if (record.titolo?.trim()) rows.push(record as DiscoveryRow);
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
