import type { AtlasPlaceRegistryEntry, UtilityCoverageReport } from "./atlas-registry.js";
import type { UtilityCinemaVenue } from "./atlas-utility-sync.js";
import type { CoverageGap, OperationalAlertDraft } from "./atlas-registry.js";

/** Sale cinema censite — provincia di Viterbo (pilota). */
export const ATLAS_CINEMA_PLACES_VT: AtlasPlaceRegistryEntry[] = [
  {
    id: "place-cinema-arena-marconi-bolsena",
    name: "Arena Marconi",
    placeType: "cinema",
    territoryId: "IT-VT",
    municipality: "Bolsena",
    status: "active",
    primarySourceId: "src-mymovies-vt",
    matchNames: ["Arena Marconi", "Marconi"],
    externalRefs: {
      mymovies: {
        slug: "bolsena",
        venue_id: "23914",
        url: "https://www.mymovies.it/cinema/viterbo/bolsena/23914/",
      },
    },
  },
  {
    id: "place-cinema-moderno-bolsena",
    name: "Multisala Moderno",
    placeType: "cinema",
    territoryId: "IT-VT",
    municipality: "Bolsena",
    status: "active",
    primarySourceId: "src-mymovies-vt",
    matchNames: ["Multisala Moderno", "Moderno"],
    externalRefs: {
      mymovies: {
        slug: "bolsena",
        venue_id: "6566",
        url: "https://www.mymovies.it/cinema/viterbo/bolsena/6566/",
      },
    },
  },
  {
    id: "place-cinema-arena-etrusco-tarquinia",
    name: "Arena Etrusco Lido",
    placeType: "cinema",
    territoryId: "IT-VT",
    municipality: "Tarquinia",
    status: "seasonal",
    primarySourceId: "src-mymovies-vt",
    matchNames: ["Arena Etrusco", "Etrusco Lido", "Arena Etrusco Lido"],
    externalRefs: {
      mymovies: {
        slug: "tarquinia",
        venue_id: "20275",
        url: "https://www.mymovies.it/cinema/viterbo/tarquinia/20275/",
      },
    },
  },
  {
    id: "place-cinema-thespace-viterbo",
    name: "The Space Cinema",
    placeType: "cinema",
    territoryId: "IT-VT",
    municipality: "Viterbo",
    status: "active",
    matchNames: ["The Space", "Space Cinema"],
    externalRefs: {
      comingsoon: {
        url: "https://www.comingsoon.it/cinema/viterbo/the-space-cinema-viterbo/5085/",
      },
    },
    notes: "Non indicizzato su MYmovies provincia — richiede fonte alternativa",
  },
];

function normalizeMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function venueMatchesPlace(venue: UtilityCinemaVenue, place: AtlasPlaceRegistryEntry): boolean {
  const cinema = normalizeMatch(venue.cinema);
  const town = normalizeMatch(venue.town ?? "");
  const placeTown = normalizeMatch(place.municipality ?? "");
  if (placeTown && town && placeTown !== town) return false;

  const names = [place.name, ...(place.matchNames ?? [])].map(normalizeMatch);
  return names.some((name) => cinema.includes(name) || name.includes(cinema));
}

/** Confronta sale trovate nel sync con il censimento atteso. */
export function checkCinemaCoverage(
  venues: UtilityCinemaVenue[],
  registry: AtlasPlaceRegistryEntry[] = ATLAS_CINEMA_PLACES_VT,
): UtilityCoverageReport {
  const activePlaces = registry.filter((place) => place.status !== "closed");
  const missing: CoverageGap[] = [];

  for (const place of activePlaces) {
    const found = venues.some((venue) => venueMatchesPlace(venue, place));
    if (found) continue;

    const hasAltSource = Boolean(place.externalRefs?.comingsoon?.url);
    missing.push({
      placeId: place.id,
      placeName: place.name,
      municipality: place.municipality,
      reason: hasAltSource
        ? "Sala censita senza dati MYmovies — serve fonte alternativa (ComingSoon/sito)"
        : "Sala censita senza programmazione nel sync odierno",
      severity: hasAltSource ? "warning" : place.status === "seasonal" ? "info" : "warning",
    });
  }

  return {
    domain: "cinema",
    expected: activePlaces.length,
    found: activePlaces.length - missing.length,
    missing,
    checkedAt: new Date().toISOString(),
  };
}

export function coverageToAlerts(report: UtilityCoverageReport): OperationalAlertDraft[] {
  return report.missing.map((gap) => ({
    alertType: "place_silent",
    severity: gap.severity,
    territoryId: "IT-VT",
    placeId: gap.placeId,
    title: `Cinema senza dati: ${gap.placeName}`,
    message: gap.reason,
    details: {
      domain: report.domain,
      municipality: gap.municipality,
      checkedAt: report.checkedAt,
    },
  }));
}
