/** Snapshot giornaliero servizi utilità (farmacie, cinema) per edizione Atlas. */

export interface UtilityPharmacyEntry {
  name: string;
  address?: string;
  phone?: string;
  url?: string;
  municipality?: string;
  /** Orari previsti per oggi, se disponibili dalla fonte. */
  hoursToday?: string;
}

export interface UtilityCinemaShowing {
  cinema: string;
  town?: string;
  times: string[];
  url?: string;
}

export interface UtilityCinemaFilm {
  title: string;
  url?: string;
  showings: UtilityCinemaShowing[];
}

export interface UtilityCinemaVenue {
  cinema: string;
  town?: string;
  url?: string;
  films: Array<{
    title: string;
    url?: string;
    times: string[];
  }>;
}

export interface UtilitySyncSection<T> {
  sourceUrl: string;
  sourceLabel: string;
  /** Data di riferimento del turno (YYYY-MM-DD), se applicabile. */
  dutyDate?: string;
  items: T[];
}

export interface UtilityPharmacyConsultation {
  all: string;
  map?: string;
}

export interface UtilitySyncSnapshot {
  editionId: string;
  territoryId: string;
  syncedAt: string;
  pharmacies: UtilitySyncSection<UtilityPharmacyEntry> & {
    consult?: UtilityPharmacyConsultation;
  };
  cinema: UtilitySyncSection<UtilityCinemaFilm> & {
    venues?: UtilityCinemaVenue[];
  };
}

export const UTILITY_SYNC_DATA_PATH = "/data/utilities";

export function utilitySyncDataUrl(editionId: string): string {
  return `${UTILITY_SYNC_DATA_PATH}/${editionId}.json`;
}

export function formatUtilitySyncDate(iso: string, locale = "it-IT"): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
