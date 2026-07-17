import type { EventCategory } from "@atlas/core";

const MONTHS: Record<string, number> = {
  gennaio: 0,
  febbraio: 1,
  marzo: 2,
  aprile: 3,
  maggio: 4,
  giugno: 5,
  luglio: 6,
  agosto: 7,
  settembre: 8,
  ottobre: 9,
  novembre: 10,
  dicembre: 11,
};

export function inferCategory(text: string, hints: string[] = []): EventCategory {
  const blob = normalize(`${text} ${hints.join(" ")}`);
  if (/\b(sport|calcio|pallavolo|maratona|corsa|bike)\b/.test(blob)) return "sport";
  if (/\b(bambin|famigl|kids|ragazzi)\b/.test(blob)) return "families";
  if (/\b(enogastronom|sagra|gusto|degustaz|food|vino|cantina|aglio|pecora)\b/.test(blob)) return "food";
  if (/\b(musica|concerto|dj|jazz|festival music)\b/.test(blob)) return "music";
  if (/\b(teatro|cultura|mostra|museo|libri|arte|spettacol|cinema|film)\b/.test(blob)) return "culture";
  return "other";
}

export function cleanTitle(title: string): string {
  return title
    .replace(/^\s*\|[^|]*\|[^|]*\|\s*/g, "")
    .replace(/^GUSTO\s*-\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Estrae città da titolo tipo "... San Martino al Cimino - ..." o "... Viterbo ..." */
export function extractCityFromTitle(title: string): string | null {
  const match = title.match(/,\s*([^,\-–]+?)\s*[-–]\s*/i) || title.match(/\|\s*([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s']+)\s*\|/);
  if (match?.[1]) return match[1].trim();
  if (/\bViterbo\b/i.test(title)) return "Viterbo";
  return null;
}

export function extractVenueFromTitle(title: string): string | null {
  const piazza = title.match(/(piazza [^,\-–]+)/i);
  if (piazza) return piazza[1].trim();
  const quartiere = title.match(/(quartiere [^,\-–]+)/i);
  if (quartiere) return quartiere[1].trim();
  return null;
}

export function parseItalianDateRange(text: string, fallbackYear = new Date().getFullYear()): {
  start: Date | null;
  end: Date | null;
} {
  const normalized = normalize(text);

  const rangeMatch = normalized.match(
    /dall['']?\s*(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+al\s+(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)/,
  );
  if (rangeMatch) {
    const start = italianDate(Number(rangeMatch[1]), rangeMatch[2], fallbackYear);
    const end = italianDate(Number(rangeMatch[3]), rangeMatch[4], fallbackYear);
    return { start, end };
  }

  const dalAl = normalized.match(
    /dal\s+(\d{1,2})\s+al\s+(\d{1,2})\s+(luglio|agosto|gennaio|febbraio|marzo|aprile|maggio|giugno|settembre|ottobre|novembre|dicembre)/,
  );
  if (dalAl) {
    const start = italianDate(Number(dalAl[1]), dalAl[3], fallbackYear);
    const end = italianDate(Number(dalAl[2]), dalAl[3], fallbackYear);
    return { start, end };
  }

  const daysMonth = normalized.match(
    /(\d{1,2})\s+e\s+(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)/,
  );
  if (daysMonth) {
    const start = italianDate(Number(daysMonth[1]), daysMonth[3], fallbackYear);
    const end = italianDate(Number(daysMonth[2]), daysMonth[3], fallbackYear);
    return { start, end };
  }

  const pipeDates = text.match(/\|\s*(\d{1,2})(?:,(\d{1,2}))?\s+([A-ZÀ-Ú]+)\s+(\d{4})/i);
  if (pipeDates) {
    const monthKey = normalize(pipeDates[3]);
    const month = Object.entries(MONTHS).find(([k]) => monthKey.startsWith(k.slice(0, 3)));
    if (month) {
      const start = italianDate(Number(pipeDates[1]), month[0], Number(pipeDates[4]));
      const endDay = pipeDates[2] ? Number(pipeDates[2]) : Number(pipeDates[1]);
      const end = italianDate(endDay, month[0], Number(pipeDates[4]));
      return { start, end };
    }
  }

  return { start: null, end: null };
}

function italianDate(day: number, monthName: string, year: number): Date {
  const month = MONTHS[normalize(monthName)] ?? 0;
  const d = new Date(year, month, day, 19, 0, 0);
  return d;
}

export function parseTusciaEventiDescription(description: string): {
  start: Date | null;
  end: Date | null;
  venue: string | null;
  city: string | null;
} {
  const plain = stripHtml(description);
  const lines = plain.split("\n").map((l) => l.trim()).filter(Boolean);
  const first = lines[0] ?? "";

  const datePart = first.match(
    /(\d{2})\/(\d{2})\/(\d{4})\s*-\s*(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/,
  );
  let start: Date | null = null;
  let end: Date | null = null;

  if (datePart) {
    const [, dd, mm, yyyy, t1, t2] = datePart;
    start = new Date(`${yyyy}-${mm}-${dd}T${t1}:00`);
    end = new Date(`${yyyy}-${mm}-${dd}T${t2}:00`);
  }

  const venue = lines[1] ?? null;
  const city = lines[lines.length - 1] ?? null;

  return { start, end, venue, city };
}

export function isPastEvent(endDate: string | null | undefined, startDate: string): boolean {
  const end = endDate ? new Date(endDate) : new Date(startDate);
  return end.getTime() < Date.now() - 24 * 60 * 60 * 1000;
}

export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Estrae date da testo libero, slug URL o intervalli cross-mese (es. 27-giugno-30-agosto-2026). */
export function parseEventDateHints(text: string, fallbackYear = new Date().getFullYear()): {
  start: Date | null;
  end: Date | null;
} {
  const plain = decodeHtmlEntities(stripHtml(text));
  const normalized = normalize(plain);

  const withYear = plain.match(
    /dal\s+(\d{1,2})\s+al\s+(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(\d{4})/i,
  );
  if (withYear) {
    const year = Number(withYear[4]);
    return {
      start: italianDate(Number(withYear[1]), withYear[3], year),
      end: italianDate(Number(withYear[2]), withYear[3], year),
    };
  }

  const singleWithYear = plain.match(
    /(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(\d{4})/i,
  );
  if (singleWithYear) {
    const start = italianDate(Number(singleWithYear[1]), singleWithYear[2], Number(singleWithYear[3]));
    return { start, end: start };
  }

  const crossMonth = normalized.match(
    /(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(\d{4})/,
  );
  if (crossMonth) {
    const year = Number(crossMonth[5]);
    return {
      start: italianDate(Number(crossMonth[1]), crossMonth[2], year),
      end: italianDate(Number(crossMonth[3]), crossMonth[4], year),
    };
  }

  const rangeInSlug = normalized.match(
    /(\d{1,2})-(\d{1,2})-(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)-(\d{4})/,
  );
  if (rangeInSlug) {
    const year = Number(rangeInSlug[4]);
    return {
      start: italianDate(Number(rangeInSlug[1]), rangeInSlug[3], year),
      end: italianDate(Number(rangeInSlug[2]), rangeInSlug[3], year),
    };
  }

  const singleInSlug = normalized.match(
    /(\d{1,2})-(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)-(\d{4})/,
  );
  if (singleInSlug) {
    const start = italianDate(Number(singleInSlug[1]), singleInSlug[2], Number(singleInSlug[3]));
    return { start, end: start };
  }

  return parseItalianDateRange(plain, fallbackYear);
}
