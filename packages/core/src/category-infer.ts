import type { EventCategory } from "./types/event.js";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Inferisce la categoria da titolo, note e campo categoria grezzo. */
export function inferEventCategory(text: string, hints: string[] = []): EventCategory {
  const blob = normalize(`${text} ${hints.join(" ")}`);
  if (/\b(sport|calcio|pallavolo|maratona|corsa|bike|torneo|pallone)\b/.test(blob)) return "sport";
  if (/\b(bambin|famigl|kids|ragazzi)\b/.test(blob)) return "families";
  if (
    /\b(enogastronom|sagra|sagre|gusto|degustaz|food|vino|cantina|aglio|pecora|cavatell|porchett|festa del|festa della|mercato del)\b/.test(
      blob,
    )
  ) {
    return "food";
  }
  if (/\b(musica|concerto|dj|jazz|festival music|live music)\b/.test(blob)) return "music";
  if (
    /\b(teatro|cultura|mostra|museo|libri|arte|spettacol|cinema|film|festival|rassegna|immagini|palco|spettacolo)\b/.test(
      blob,
    )
  ) {
    return "culture";
  }
  return "other";
}

function isGenericCategory(value: string): boolean {
  return !value || value === "other" || value === "altro" || value === "altri";
}

const CATEGORY_ALIASES: Record<string, EventCategory> = {
  music: "music",
  musica: "music",
  food: "food",
  enogastronomia: "food",
  sagra: "food",
  sagre: "food",
  culture: "culture",
  cultura: "culture",
  teatro: "culture",
  sport: "sport",
  families: "families",
  famiglie: "families",
  famiglia: "families",
  bambini: "families",
  other: "other",
  altri: "other",
  altro: "other",
};

/** Mappa campo categoria esplicito, con fallback su inferenza dal titolo. */
export function resolveEventCategory(
  raw: string | undefined | null,
  title: string,
  hints: string[] = [],
): EventCategory {
  const value = (raw ?? "").trim().toLowerCase();
  if (!isGenericCategory(value) && CATEGORY_ALIASES[value]) return CATEGORY_ALIASES[value];
  return inferEventCategory(title, [...hints, raw ?? ""]);
}

/** Categoria effettiva per mappa/UI: se DB ha «other», inferisce dal titolo. */
export function getDisplayCategory(event: {
  category?: string | null;
  title: string;
  description?: string | null;
  venue?: string | null;
}): EventCategory {
  const stored = (event.category ?? "").trim().toLowerCase();
  if (!isGenericCategory(stored) && CATEGORY_ALIASES[stored]) {
    return CATEGORY_ALIASES[stored];
  }
  return inferEventCategory(event.title, [event.description ?? "", event.venue ?? ""]);
}
