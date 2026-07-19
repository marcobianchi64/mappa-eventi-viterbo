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
  if (/\b(sport|calcio|pallavolo|maratona|corsa|bike|torneo)\b/.test(blob)) return "sport";
  if (/\b(bambin|famigl|kids|ragazzi)\b/.test(blob)) return "families";
  if (/\b(enogastronom|sagra|gusto|degustaz|food|vino|cantina|aglio|pecora|cavatell)\b/.test(blob)) {
    return "food";
  }
  if (/\b(musica|concerto|dj|jazz|festival music)\b/.test(blob)) return "music";
  if (/\b(teatro|cultura|mostra|museo|libri|arte|spettacol|cinema|film|festival|rassegna|immagini)\b/.test(
    blob,
  )) {
    return "culture";
  }
  return "other";
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
  if (value && CATEGORY_ALIASES[value]) return CATEGORY_ALIASES[value];
  return inferEventCategory(title, [...hints, raw ?? ""]);
}
