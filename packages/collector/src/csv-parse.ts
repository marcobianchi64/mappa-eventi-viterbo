import { readFileSync } from "node:fs";

export interface CsvRow {
  line: number;
  values: Record<string, string>;
}

const EXPECTED_HEADERS = [
  "stato",
  "organizzatore",
  "titolo",
  "comune",
  "luogo",
  "data_inizio",
  "data_fine",
  "orario",
  "url_evento",
  "url_fonte",
  "tipo_fonte",
  "categoria",
  "note",
] as const;

export function parseCsvFile(filePath: string): CsvRow[] {
  const raw = readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeHeader);

  return lines.slice(1).map((line, index) => {
    const cells = splitCsvLine(line, delimiter);
    const values: Record<string, string> = {};
    headers.forEach((header, i) => {
      values[header] = (cells[i] ?? "").trim();
    });
    return { line: index + 2, values };
  });
}

export function validateHeaders(rows: CsvRow[]): string[] {
  if (rows.length === 0) return ["File CSV vuoto"];
  const keys = Object.keys(rows[0].values);
  const missing = EXPECTED_HEADERS.filter((h) => !keys.includes(h));
  if (missing.length) {
    return [`Colonne mancanti: ${missing.join(", ")}. Usa TEMPLATE_EVENTI.csv`];
  }
  return [];
}

function detectDelimiter(headerLine: string): string {
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  return semicolons >= commas ? ";" : ",";
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w]/g, "");
}
