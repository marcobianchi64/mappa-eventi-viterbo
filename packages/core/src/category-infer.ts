import type { EventCategory } from "./types/event.js";
import { splitGluedWords } from "./title-format.js";

function normalize(value: string): string {
  return splitGluedWords(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Parole nel titolo che indicano enogastronomia (controllo prioritario). */
export const FOOD_TITLE_KEYWORDS = [
  "sagra",
  "sagre",
  "vino",
  "vini",
  "bistecca",
  "bistecche",
  "gnocchi",
  "gnocco",
  "porchetta",
  "porchett",
  "tartufo",
  "tartufi",
  "fungo",
  "funghi",
  "aglio",
  "pecora",
  "cavatello",
  "cavatelli",
  "enogastronom",
  "gusto",
  "degustaz",
  "cantina",
  "birra",
  "birre",
  "formaggio",
  "formaggi",
  "salumi",
  "prosciutto",
  "olive",
  "olio",
  "miele",
  "pasta",
  "pizza",
  "fritta",
  "frittura",
  "gastronom",
  "cucina",
  "piatti",
  "piatto",
  "convivio",
  "mercato del",
  "mercato della",
  "prodotti tipici",
  "food",
  "wine",
  "festa del",
  "festa della",
  "festa degli",
  "festa di",
  "feste del",
  "feste degli",
] as const;

const CULTURE_TITLE_KEYWORDS = [
  "manifestazion",
  "tradizioni popolari",
  "teatro",
  "mostra",
  "museo",
  "spettacol",
  "cinema",
  "rassegna",
  "festival",
  "concerto",
  "musica",
  "estate a",
] as const;

const SPORT_TITLE_KEYWORDS = ["maratona", "corsa", "calcio", "torneo", "podistic", "ciclismo"] as const;

const FAMILIES_TITLE_KEYWORDS = ["bambin", "famigl", "kids", "ragazzi"] as const;

function matchesKeyword(blob: string, keywords: readonly string[]): boolean {
  return keywords.some((word) => blob.includes(word));
}

/** Inferenza rapida dal solo titolo (criterio principale richiesto). */
export function inferCategoryFromTitle(title: string): EventCategory | null {
  const blob = normalize(title);
  if (!blob) return null;
  if (matchesKeyword(blob, FAMILIES_TITLE_KEYWORDS)) return "families";
  if (matchesKeyword(blob, SPORT_TITLE_KEYWORDS)) return "sport";
  if (matchesKeyword(blob, FOOD_TITLE_KEYWORDS)) return "food";
  if (matchesKeyword(blob, CULTURE_TITLE_KEYWORDS)) return "culture";
  if (/\b(dj|jazz|live music)\b/.test(blob)) return "music";
  return null;
}

function inferFromBlob(blob: string): EventCategory {
  if (/\b(sport|calcio|pallavolo|maratona|corsa|bike|torneo|pallone|podistic)\b/.test(blob)) {
    return "sport";
  }
  if (/\b(bambin|famigl|kids|ragazzi)\b/.test(blob)) return "families";

  if (matchesKeyword(blob, FOOD_TITLE_KEYWORDS)) return "food";

  if (/\b(musica|concerto|dj|jazz|live music)\b/.test(blob)) return "music";

  if (matchesKeyword(blob, CULTURE_TITLE_KEYWORDS)) return "culture";

  return "other";
}

/** Inferisce la categoria da titolo, note e campo categoria grezzo. */
export function inferEventCategory(text: string, hints: string[] = []): EventCategory {
  const fromTitle = inferCategoryFromTitle(text);
  if (fromTitle) return fromTitle;
  const blob = normalize(`${text} ${hints.join(" ")}`);
  return inferFromBlob(blob);
}

function isGenericCategory(value: string): boolean {
  return !value || value === "other" || value === "altro" || value === "altri";
}

const CATEGORY_ALIASES: Record<string, EventCategory> = {
  music: "music",
  musica: "music",
  food: "food",
  enogastronomia: "food",
  gusto: "food",
  sagra: "food",
  sagre: "food",
  culture: "culture",
  cultura: "culture",
  teatro: "culture",
  manifestazioni: "culture",
  manifestazione: "culture",
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

export interface CategoryInferInput {
  title: string;
  description?: string | null;
  venue?: string | null;
  comune?: string | null;
  city?: string | null;
  location?: string | null;
  category?: string | null;
}

/** Categoria effettiva per mappa/UI: prima il titolo, poi gli altri campi. */
export function getDisplayCategory(event: CategoryInferInput): EventCategory {
  const stored = (event.category ?? "").trim().toLowerCase();
  if (!isGenericCategory(stored) && CATEGORY_ALIASES[stored]) {
    return CATEGORY_ALIASES[stored];
  }

  const fromTitle = inferCategoryFromTitle(event.title);
  if (fromTitle) return fromTitle;

  const blob = normalize(
    [event.title, event.description, event.venue, event.comune, event.city, event.location, event.category]
      .filter(Boolean)
      .join(" "),
  );
  return inferFromBlob(blob);
}
