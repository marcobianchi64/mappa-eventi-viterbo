/** Coordinate centro abitato — provincia di Viterbo (fonte: dati ISTAT/OSM). */
export const VITERBO_PROVINCE_CENTER = { lat: 42.4174, lng: 12.1049 };

const COMUNE_COORDS: Record<string, { lat: number; lng: number }> = {
  acquapendente: { lat: 42.7448467, lng: 11.8651623 },
  "arlena di castro": { lat: 42.4639101, lng: 11.8217736 },
  bagnoregio: { lat: 42.6272329, lng: 12.090299 },
  "barbarano romano": { lat: 42.2501334, lng: 12.0665563 },
  "bassano in teverina": { lat: 42.465539, lng: 12.310556 },
  "bassano romano": { lat: 42.218071, lng: 12.1923359 },
  blera: { lat: 42.272694, lng: 12.027549 },
  bolsena: { lat: 42.6448518, lng: 11.9861111 },
  bomarzo: { lat: 42.487133, lng: 12.250393 },
  calcata: { lat: 42.2192583, lng: 12.4264913 },
  canepina: { lat: 42.3832962, lng: 12.2329814 },
  canino: { lat: 42.465, lng: 11.7522037 },
  capodimonte: { lat: 42.5475, lng: 11.9057962 },
  capranica: { lat: 42.2598703, lng: 12.1731481 },
  caprarola: { lat: 42.3241037, lng: 12.2426185 },
  carbognano: { lat: 42.3326666, lng: 12.2653148 },
  "castel sant'elia": { lat: 42.2505045, lng: 12.3700624 },
  "castiglione in teverina": { lat: 42.6489074, lng: 12.2043888 },
  celleno: { lat: 42.559492, lng: 12.125881 },
  cellere: { lat: 42.5114074, lng: 11.7726666 },
  "civita castellana": { lat: 42.28884, lng: 12.4115155 },
  "civitella d'agliano": { lat: 42.6042222, lng: 12.1879814 },
  corchiano: { lat: 42.3459444, lng: 12.3567407 },
  "fabrica di roma": { lat: 42.33378, lng: 12.299857 },
  faleria: { lat: 42.2275, lng: 12.4464259 },
  farnese: { lat: 42.5504814, lng: 11.7267407 },
  gallese: { lat: 42.372649, lng: 12.403207 },
  gradoli: { lat: 42.644537, lng: 11.8559629 },
  graffignano: { lat: 42.5736111, lng: 12.2026666 },
  "grotte di castro": { lat: 42.674852, lng: 11.869638 },
  "ischia di castro": { lat: 42.545, lng: 11.7573703 },
  latera: { lat: 42.63, lng: 11.8284444 },
  lubriano: { lat: 42.6363609, lng: 12.1115517 },
  marta: { lat: 42.5347037, lng: 11.9261111 },
  "montalto di castro": { lat: 42.3514074, lng: 11.6079814 },
  "monte romano": { lat: 42.2682744, lng: 11.8952405 },
  montefiascone: { lat: 42.5379839, lng: 12.0363877 },
  monterosi: { lat: 42.194882, lng: 12.310402 },
  nepi: { lat: 42.2439259, lng: 12.346574 },
  onano: { lat: 42.692282, lng: 11.816618 },
  "oriolo romano": { lat: 42.1592407, lng: 12.1389074 },
  orte: { lat: 42.4603148, lng: 12.3864259 },
  piansano: { lat: 42.5232962, lng: 11.8301666 },
  proceno: { lat: 42.7582962, lng: 11.8306296 },
  ronciglione: { lat: 42.2914074, lng: 12.2142222 },
  "san lorenzo nuovo": { lat: 42.6862831, lng: 11.9059684 },
  "soriano nel cimino": { lat: 42.4198772, lng: 12.2343999 },
  sutri: { lat: 42.242723, lng: 12.220369 },
  tarquinia: { lat: 42.2546645, lng: 11.7584678 },
  tessennano: { lat: 42.4793888, lng: 11.7914259 },
  tuscania: { lat: 42.419248, lng: 11.870288 },
  valentano: { lat: 42.5664119, lng: 11.8183557 },
  vallerano: { lat: 42.385, lng: 12.2645555 },
  vasanello: { lat: 42.4148703, lng: 12.3475 },
  vejano: { lat: 42.2182962, lng: 12.096574 },
  vetralla: { lat: 42.3208563, lng: 12.053244 },
  vignanello: { lat: 42.3835849, lng: 12.277145 },
  "villa san giovanni in tuscia": { lat: 42.2829929, lng: 12.0553379 },
  viterbo: { lat: 42.4173794, lng: 12.1048541 },
  vitorchiano: { lat: 42.4664074, lng: 12.1734444 },
};

const COMUNE_ALIASES: Record<string, string> = {
  vitrochino: "vitorchiano",
  vitrochiano: "vitorchiano",
  "soriano": "soriano nel cimino",
};

const COMUNE_NAMES_BY_LENGTH = Object.keys(COMUNE_COORDS).sort((a, b) => b.length - a.length);

export function normalizeComuneName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Risolve coordinate da comune (provincia di Viterbo). */
export function geocodeComuneViterbo(comune?: string | null): { lat: number; lng: number } {
  const key = resolveComuneKey(comune ?? "");
  if (!key) return VITERBO_PROVINCE_CENTER;
  return COMUNE_COORDS[key];
}

function resolveComuneKey(raw: string): string | null {
  let key = normalizeComuneName(raw);
  if (!key) return null;
  if (COMUNE_ALIASES[key]) key = COMUNE_ALIASES[key];
  if (COMUNE_COORDS[key]) return key;

  for (const name of COMUNE_NAMES_BY_LENGTH) {
    if (key.includes(name) || name.includes(key)) return name;
  }
  return null;
}

/** Cerca un comune VT in testo libero (titolo, luogo, venue…). */
export function inferComuneFromText(...parts: Array<string | null | undefined>): string | null {
  const haystack = normalizeComuneName(parts.filter(Boolean).join(" "));
  if (!haystack) return null;

  for (const aliasKey of Object.keys(COMUNE_ALIASES)) {
    if (haystack.includes(aliasKey)) return COMUNE_ALIASES[aliasKey];
  }

  for (const name of COMUNE_NAMES_BY_LENGTH) {
    if (haystack.includes(name)) return name;
  }
  return null;
}

export function inferComuneForEvent(event: {
  comune?: string | null;
  city?: string | null;
  venue?: string | null;
  title?: string | null;
  location?: string | null;
}): string | null {
  const direct = resolveComuneKey(event.comune ?? event.city ?? "");
  if (direct) return direct;
  return inferComuneFromText(event.venue, event.location, event.title, event.comune, event.city);
}

export function formatComuneLabel(comuneKey: string): string {
  if (comuneKey === "castel sant'elia") return "Castel Sant'Elia";
  if (comuneKey === "civitella d'agliano") return "Civitella d'Agliano";
  if (comuneKey === "soriano nel cimino") return "Soriano nel Cimino";
  if (comuneKey === "villa san giovanni in tuscia") return "Villa San Giovanni in Tuscia";
  return comuneKey
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/** Pin lontano dal comune dichiarato (soglia km). */
export function isPinFarFromComune(
  event: { lat: number; lng: number; comune?: string | null; city?: string | null; venue?: string | null; title?: string | null },
  thresholdKm = 3,
): boolean {
  const key = inferComuneForEvent(event);
  if (!key || key === "viterbo") return false;
  const expected = COMUNE_COORDS[key];
  return distanceKm(event.lat, event.lng, expected.lat, expected.lng) > thresholdKm;
}

export function listViterboComuni(): string[] {
  return Object.keys(COMUNE_COORDS).sort((a, b) => a.localeCompare(b, "it"));
}

/** True se le coordinate sono il fallback Viterbo usato dalla Scoperta legacy. */
export function isLegacyViterboCenter(lat: number, lng: number): boolean {
  return Math.abs(lat - 42.4207) < 0.002 && Math.abs(lng - 12.1042) < 0.002;
}

export function resolveEventCoordinates(input: {
  comune?: string | null;
  city?: string | null;
  venue?: string | null;
  title?: string | null;
  lat?: number | null;
  lng?: number | null;
}): { lat: number; lng: number } {
  const key =
    resolveComuneKey(input.comune ?? input.city ?? "") ??
    inferComuneFromText(input.venue, input.title, input.comune, input.city);
  if (key) return COMUNE_COORDS[key];

  const lat = Number(input.lat);
  const lng = Number(input.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };

  return VITERBO_PROVINCE_CENTER;
}
