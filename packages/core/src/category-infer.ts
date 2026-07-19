import type { EventCategory } from "./types/event.js";
import { splitGluedWords } from "./title-format.js";

function normalize(value: string): string {
  return splitGluedWords(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function inferFromBlob(blob: string): EventCategory {
  if (/\b(sport|calcio|pallavolo|maratona|corsa|bike|torneo|pallone|podistic)\b/.test(blob)) {
    return "sport";
  }
  if (/\b(bambin|famigl|kids|ragazzi)\b/.test(blob)) return "families";

  if (
    /sagra|sagre|enogastronom|gusto|degustaz|food|vino|cantina|aglio|pecora|cavatell|porchett|tartuf|fungh|frittur|prodotti tipici|mercato del|mercato della/.test(
      blob,
    )
  ) {
    return "food";
  }

  if (/\b(musica|concerto|dj|jazz|live music)\b/.test(blob)) return "music";

  if (
    /manifestazion|tradizioni popolari|teatro|mostra|museo|libri|arte|spettacol|cinema|film|rassegna|immagini|palco|spettacolo|festival|estate a .+ tra/.test(
      blob,
    )
  ) {
    return "culture";
  }

  return "other";
}

/** Inferisce la categoria da titolo, note e campo categoria grezzo. */
export function inferEventCategory(text: string, hints: string[] = []): EventCategory {
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

/** Categoria effettiva per mappa/UI: inferisce da tutti i campi testuali. */
export function getDisplayCategory(event: CategoryInferInput): EventCategory {
  const stored = (event.category ?? "").trim().toLowerCase();
  if (!isGenericCategory(stored) && CATEGORY_ALIASES[stored]) {
    return CATEGORY_ALIASES[stored];
  }

  const blob = normalize(
    [event.title, event.description, event.venue, event.comune, event.city, event.location, event.category]
      .filter(Boolean)
      .join(" "),
  );
  return inferFromBlob(blob);
}
