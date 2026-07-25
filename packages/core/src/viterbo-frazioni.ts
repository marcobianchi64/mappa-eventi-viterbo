/**
 * Frazioni e località della provincia di Viterbo con coordinate proprie.
 * Priorità sul centro del comune capoluogo (es. Bagnaia ≠ centro Viterbo).
 */
export type FrazioneEntry = {
  lat: number;
  lng: number;
  /** Chiave comune in COMUNE_COORDS (es. viterbo). */
  parentComune: string;
  /** Etichetta per log / admin. */
  label: string;
};

/** Chiave normalizzata → coordinate (fonte: OSM / ISTAT, arrotondato). */
export const VITERBO_FRAZIONI: Record<string, FrazioneEntry> = {
  bagnaia: { lat: 42.42806, lng: 12.155, parentComune: "viterbo", label: "Bagnaia" },
  "la quercia": { lat: 42.4042, lng: 12.0897, parentComune: "viterbo", label: "La Quercia" },
  quercia: { lat: 42.4042, lng: 12.0897, parentComune: "viterbo", label: "La Quercia" },
  fastello: { lat: 42.4525, lng: 12.1285, parentComune: "viterbo", label: "Fastello" },
  roccalvecce: { lat: 42.4089, lng: 12.1786, parentComune: "viterbo", label: "Roccalvecce" },
  "torre d'orlando": { lat: 42.4458, lng: 12.1194, parentComune: "viterbo", label: "Torre d'Orlando" },
  treporti: { lat: 42.4012, lng: 12.1588, parentComune: "viterbo", label: "Treporti" },
  campolungo: { lat: 42.4318, lng: 12.1125, parentComune: "viterbo", label: "Campolungo" },
  "san martino al cimino": {
    lat: 42.2464,
    lng: 12.3022,
    parentComune: "viterbo",
    label: "San Martino al Cimino",
  },
  "villa lante": { lat: 42.4288, lng: 12.1542, parentComune: "viterbo", label: "Bagnaia (Villa Lante)" },
};

const FRAZIONE_NAMES_BY_LENGTH = Object.keys(VITERBO_FRAZIONI).sort((a, b) => b.length - a.length);

export function normalizeLocalitaName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Cerca una frazione/località nel testo (venue, titolo, comune…). */
export function inferLocalitaFromText(...parts: Array<string | null | undefined>): string | null {
  const haystack = normalizeLocalitaName(parts.filter(Boolean).join(" "));
  if (!haystack) return null;

  for (const name of FRAZIONE_NAMES_BY_LENGTH) {
    if (haystack.includes(name)) return name;
  }
  return null;
}

export function getFrazioneEntry(key: string): FrazioneEntry | null {
  return VITERBO_FRAZIONI[key] ?? null;
}
