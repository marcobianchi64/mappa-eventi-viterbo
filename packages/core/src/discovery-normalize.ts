/** Pulisce celle incollate da ChatGPT / Google (link markdown, note [1]). */
export function sanitizeDiscoveryCell(raw: string | undefined): string {
  if (!raw) return "";
  let v = raw.trim();
  if (!v) return "";

  const md = v.match(/^\[([^\]]*)\]\(([^)]+)\)\s*$/);
  if (md) return md[2].trim();

  if (v.includes("](")) {
    v = v.replace(/\[([^\]]*)\]\(([^)]+)\)/g, "$2");
  }

  v = v.replace(/\s*\([^)]*\)\s*\[\d+\]\s*$/g, "").trim();
  v = v.replace(/\s*\[[^\]]+\]\[\d+\]\s*/g, " ").trim();
  return v;
}

/** Estrae la prima data valida da ISO, italiana o testi tipo «2026-09-12 oppure 2026-09-20». */
export function normalizeDiscoveryDateString(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  const v = sanitizeDiscoveryCell(raw);

  const iso = v.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dmy = v.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](20\d{2})\b/);
  if (dmy) {
    const dd = dmy[1].padStart(2, "0");
    const mm = dmy[2].padStart(2, "0");
    return `${dmy[3]}-${mm}-${dd}`;
  }

  return null;
}

export function parseDiscoveryDateTime(
  dateRaw: string | undefined,
  orario?: string,
): Date | null {
  const normalized = normalizeDiscoveryDateString(dateRaw);
  if (!normalized) return null;

  const [y, m, d] = normalized.split("-").map(Number);
  const date = new Date(y, m - 1, d, 19, 0, 0, 0);

  const time = sanitizeDiscoveryCell(orario);
  const t = time.match(/^(\d{1,2}):(\d{2})/);
  if (t) date.setHours(Number(t[1]), Number(t[2]), 0, 0);

  return Number.isNaN(date.getTime()) ? null : date;
}
