import type { AtlasEvent } from "./types/event.js";
import { listViterboComuni, normalizeComuneName } from "./viterbo-geocode.js";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Inserisce spazi tra minuscola/numero e maiuscola (es. CavatelloGraffignano). */
export function splitGluedWords(text: string): string {
  return text
    .replace(/([a-zà-ú0-9])([A-ZÀ-Ú])/g, "$1 $2")
    .replace(/([A-ZÀ-Ú]{2,})([A-ZÀ-Ú][a-zà-ú])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

/** Rimuove prefissi da scraping (MANIFESTAZIONI, pipe data|comune, ecc.). */
export function cleanPublishedTitle(title: string): string {
  let t = splitGluedWords(title.trim());
  t = t.replace(/^(MANIFESTAZIONI|GUSTO|MUSICA|SPORT|CULTURA|ENOGASTRO(?:NOMIA)?)\s*/i, "");
  t = t.replace(
    /^\d{1,2}\s+[A-ZÀ-Ú]{3,12}\s+\d{4}\s*\|\s*[^–—-]+[-–—]\s*/i,
    "",
  );
  t = t.replace(/^\d{1,2}\/\d{1,2}\/\d{4}\s*[-–—|]\s*/i, "");
  return t.replace(/\s+/g, " ").trim() || title.trim();
}

/** Estrae un titolo leggibile da titolo grezzo + descrizione (es. Caprarola estate). */
export function refineEventTitle(event: Pick<AtlasEvent, "title" | "description" | "venue" | "comune" | "city">): string {
  const sources = [event.title, event.description ?? "", event.venue ?? ""].map(cleanPublishedTitle);

  for (const source of sources) {
    const estate = source.match(/L['']estate a [^.–—\n]{8,120}/i);
    if (estate) return estate[0].trim();

    const sagra = source.match(/Sagra\s+(?:del|della|di|dei|degli)\s+[^.–—\n|]{4,80}/i);
    if (sagra) return sagra[0].trim();

    const festa = source.match(/Festa\s+(?:del|della|di|dei|degli)\s+[^.–—\n|]{4,80}/i);
    if (festa) return festa[0].trim();
  }

  const cleaned = cleanPublishedTitle(event.title);
  if (isWeakTitle(cleaned) && event.description) {
    const fromDesc = cleanPublishedTitle(event.description.split("\n")[0] ?? "");
    if (!isWeakTitle(fromDesc)) return fromDesc;
  }

  return stripTrailingComune(cleaned, event.comune ?? event.city);
}

function isWeakTitle(title: string): boolean {
  const t = normalize(title);
  if (title.length < 12) return true;
  if (/^(centro storico|piazza|via|largo|comune|manifestazioni)\b/.test(t)) return true;
  if (/^\d{1,2}[\/\-.]\d{1,2}/.test(t)) return true;
  return false;
}

function stripTrailingComune(title: string, comune?: string | null): string {
  if (!comune) {
    for (const name of listViterboComuni()) {
      const re = new RegExp(`${normalizeComuneName(name).replace(/'/g, "['']?")}$`, "i");
      if (re.test(normalize(title).replace(/\s+/g, ""))) {
        return title.replace(new RegExp(`${name}.*$`, "i"), "").trim();
      }
    }
    return title;
  }
  const key = normalizeComuneName(comune);
  const glued = new RegExp(`(${key}|${splitGluedWords(comune)})\\s*(centro storico|piazza.*)?$`, "i");
  return title.replace(glued, "").trim() || title;
}

/** Titolo mostrato su mappa e schede evento. */
export function getEventDisplayTitle(
  event: Pick<AtlasEvent, "title" | "description" | "venue" | "comune" | "city">,
): string {
  return refineEventTitle(event);
}
