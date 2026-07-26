import type { AtlasEvent } from "./types/event.js";
import type { EventLocationConfidence } from "./event-location-confidence.js";

/** Caso di regressione: evento + attese (mappa, luogo, dedupe). */
export interface GoldenEventCase {
  id: string;
  description: string;
  event: Pick<
    AtlasEvent,
    "title" | "start_date" | "end_date" | "comune" | "city" | "venue" | "lat" | "lng" | "event_url"
  >;
  expect: {
    allowDirections?: boolean;
    confidence?: EventLocationConfidence;
    /** Distanza minima dal centro provincia (km) dopo assess. */
    minKmFromProvinceCenter?: number;
  };
}

export interface GoldenDedupePair {
  id: string;
  description: string;
  a: Pick<AtlasEvent, "title" | "start_date" | "end_date" | "comune" | "city" | "venue" | "lat" | "lng">;
  b: Pick<AtlasEvent, "title" | "start_date" | "end_date" | "comune" | "city" | "venue" | "lat" | "lng">;
  shouldBeMapDuplicates: boolean;
}

const vitorchiano = { lat: 42.4664074, lng: 12.1734444, comune: "Vitorchiano", city: "Vitorchiano" };

export const GOLDEN_EVENT_CASES: GoldenEventCase[] = [
  {
    id: "traindeville-civitella",
    description: "Concerto con comune dichiarato ma pin legacy su Viterbo — no Guidami",
    event: {
      title: "Traindeville in concerto",
      start_date: "2026-08-15T21:00:00.000Z",
      end_date: null,
      comune: "Civitella d'Agliano",
      city: null,
      venue: "Cassero della Torre dei Monaldeschi",
      lat: 42.42,
      lng: 12.104,
      event_url: "https://example.com/traindeville",
    },
    expect: { allowDirections: false, confidence: "medium" },
  },
  {
    id: "cavatello-vitorchiano",
    description: "Sagra con comune e venue — Guidami consentito",
    event: {
      title: "Sagra del Cavatello",
      start_date: "2026-08-02T19:00:00.000Z",
      end_date: "2026-08-04T23:00:00.000Z",
      ...vitorchiano,
      venue: "Centro storico, Piazza Roma",
      event_url: "https://example.com/cavatello",
    },
    expect: { allowDirections: true, confidence: "high" },
  },
];

export interface GoldenGeocodeCase {
  id: string;
  description: string;
  input: { comune?: string; venue?: string; title?: string };
  expect: { localitaKey?: string; minKmFromProvinceCenter?: number };
}

export const GOLDEN_GEOCODE_CASES: GoldenGeocodeCase[] = [
  {
    id: "bagnaia-frazione",
    description: "Frazione Bagnaia non sul centro Viterbo",
    input: { comune: "Viterbo", venue: "Bagnaia", title: "Festa del Pellegrino" },
    expect: { localitaKey: "bagnaia", minKmFromProvinceCenter: 2 },
  },
];

export const GOLDEN_DEDUPE_PAIRS: GoldenDedupePair[] = [
  {
    id: "bolsena-distinct-concerts",
    description: "Concerti Bolsenarte in giorni diversi — pin distinti",
    a: {
      title: "Bolsenarte — Concerto jazz con Mario Rossi",
      start_date: "2026-07-05T19:00:00.000Z",
      end_date: null,
      comune: "Bolsena",
      city: "Bolsena",
      venue: "Lungolago",
      lat: 42.364,
      lng: 11.986,
    },
    b: {
      title: "Bolsenarte — Serata rock con The Lakes",
      start_date: "2026-07-06T19:00:00.000Z",
      end_date: null,
      comune: "Bolsena",
      city: "Bolsena",
      venue: "Lungolago",
      lat: 42.364,
      lng: 11.986,
    },
    shouldBeMapDuplicates: false,
  },
  {
    id: "cavatello-reimport",
    description: "Stessa sagra reimportata — un solo pin",
    a: {
      title: "Sagra del Cavatello Vitorchiano Centro Storico",
      start_date: "2026-07-31T19:00:00.000Z",
      end_date: "2026-08-03T19:00:00.000Z",
      ...vitorchiano,
      venue: "Piazza Roma",
    },
    b: {
      title: "Sagra del Cavatello - Vitorchiano",
      start_date: "2026-08-02T19:00:00.000Z",
      end_date: "2026-08-04T19:00:00.000Z",
      ...vitorchiano,
      venue: "Centro storico",
    },
    shouldBeMapDuplicates: true,
  },
];
