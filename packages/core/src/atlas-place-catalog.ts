import type {
  AtlasPlaceRegistryEntry,
  CoverageGap,
  OperationalAlertDraft,
  UtilityCoverageReport,
} from "./atlas-registry.js";
import type { UtilityCinemaVenue } from "./atlas-utility-sync.js";

/** Sale cinema censite — provincia di Viterbo (fonte: MYmovies + ComingSoon). */
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
    id: "place-cinema-tevere-castiglione",
    name: "Tevere",
    placeType: "cinema",
    territoryId: "IT-VT",
    municipality: "Castiglione in Teverina",
    status: "active",
    primarySourceId: "src-mymovies-vt",
    matchNames: ["Cinema Tevere", "Tevere"],
    externalRefs: {
      mymovies: {
        slug: "castiglioneinteverina",
        venue_id: "6102",
        url: "https://www.mymovies.it/cinema/viterbo/castiglioneinteverina/6102/",
      },
    },
  },
  {
    id: "place-cinema-gallery-montefiascone",
    name: "Cinema Multisala Gallery",
    placeType: "cinema",
    territoryId: "IT-VT",
    municipality: "Montefiascone",
    status: "active",
    primarySourceId: "src-mymovies-vt",
    matchNames: ["Gallery", "Cinema Gallery", "Multisala Gallery"],
    externalRefs: {
      mymovies: {
        slug: "montefiascone",
        venue_id: "5883",
        url: "https://www.mymovies.it/cinema/viterbo/montefiascone/5883/",
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
    notes: "Cinema estivo sul lido",
  },
  {
    id: "place-cinema-etrusco-tarquinia",
    name: "Etrusco",
    placeType: "cinema",
    territoryId: "IT-VT",
    municipality: "Tarquinia",
    status: "active",
    primarySourceId: "src-mymovies-vt",
    matchNames: ["Cinema Etrusco", "Etrusco"],
    externalRefs: {
      mymovies: {
        slug: "tarquinia",
        venue_id: "4985",
        url: "https://www.mymovies.it/cinema/viterbo/tarquinia/4985/",
      },
    },
  },
  {
    id: "place-cinema-excelsior-vetralla",
    name: "Excelsior",
    placeType: "cinema",
    territoryId: "IT-VT",
    municipality: "Vetralla",
    matchTowns: ["Cura"],
    status: "active",
    primarySourceId: "src-mymovies-vt",
    matchNames: ["Excelsior"],
    externalRefs: {
      mymovies: {
        slug: "cura",
        venue_id: "6173",
        url: "https://www.mymovies.it/cinema/viterbo/cura/6173/",
      },
    },
    notes: "Frazione Cura di Vetralla su MYmovies",
  },
  {
    id: "place-cinema-tuscia-village-vitorchiano",
    name: "Cine Tuscia Village",
    placeType: "cinema",
    territoryId: "IT-VT",
    municipality: "Vitorchiano",
    status: "active",
    primarySourceId: "src-mymovies-vt",
    matchNames: ["Cine Tuscia Village", "Tuscia Village", "Cinetuscia Village"],
    externalRefs: {
      mymovies: {
        slug: "vitorchiano",
        venue_id: "21249",
        url: "https://www.mymovies.it/cinema/viterbo/vitorchiano/21249/",
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

function townMatchesPlace(town: string, place: AtlasPlaceRegistryEntry): boolean {
  if (!town) return true;
  const placeTown = normalizeMatch(place.municipality ?? "");
  if (!placeTown) return true;
  if (placeTown === town) return true;
  return (place.matchTowns ?? []).some((alt) => normalizeMatch(alt) === town);
}

function venueMatchesPlace(venue: UtilityCinemaVenue, place: AtlasPlaceRegistryEntry): boolean {
  const mymovies = place.externalRefs?.mymovies;
  if (venue.url && mymovies?.venue_id && venue.url.includes(`/${mymovies.venue_id}/`)) {
    return true;
  }

  const cinema = normalizeMatch(venue.cinema);
  const town = normalizeMatch(venue.town ?? "");
  if (!townMatchesPlace(town, place)) return false;

  const names = [place.name, ...(place.matchNames ?? [])].map(normalizeMatch);
  return names.some((name) => cinemaNameMatches(cinema, name));
}

function cinemaNameMatches(cinema: string, name: string): boolean {
  if (cinema === name) return true;
  const nameWords = name.split(/\s+/).filter(Boolean);
  if (nameWords.length >= 2) {
    return cinema.includes(name) || name.includes(cinema);
  }
  // Nome a parola singola: evita falsi positivi (es. Etrusco vs Arena Etrusco Lido).
  return cinema.split(/\s+/).includes(name);
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

function venueUrlFromPlace(place: AtlasPlaceRegistryEntry): string | undefined {
  return (
    place.externalRefs?.mymovies?.url ??
    place.externalRefs?.comingsoon?.url ??
    undefined
  );
}

/** Ordina per comune e nome — elenco provincia costante. */
export function sortCinemaVenuesForDisplay(venues: UtilityCinemaVenue[]): UtilityCinemaVenue[] {
  return [...venues].sort((a, b) => {
    const town = (a.town ?? "").localeCompare(b.town ?? "", "it");
    if (town !== 0) return town;
    return a.cinema.localeCompare(b.cinema, "it");
  });
}

/** Unisce sync odierno con censimento: tutte le sale sempre visibili. */
export function mergeCinemaVenuesWithRegistry(
  syncedVenues: UtilityCinemaVenue[],
  registry: AtlasPlaceRegistryEntry[] = ATLAS_CINEMA_PLACES_VT,
): UtilityCinemaVenue[] {
  const merged: UtilityCinemaVenue[] = [];
  const usedSynced = new Set<number>();

  for (const place of registry.filter(
    (entry) => entry.placeType === "cinema" && entry.status !== "closed",
  )) {
    const matchIdx = syncedVenues.findIndex((venue) => venueMatchesPlace(venue, place));
    const synced = matchIdx >= 0 ? syncedVenues[matchIdx] : null;
    if (matchIdx >= 0) usedSynced.add(matchIdx);

    merged.push({
      cinema: place.name,
      town: place.municipality,
      url: synced?.url ?? venueUrlFromPlace(place),
      films: synced?.films ?? [],
      placeId: place.id,
      placeStatus: place.status,
    });
  }

  syncedVenues.forEach((venue, index) => {
    if (!usedSynced.has(index)) merged.push(venue);
  });

  return sortCinemaVenuesForDisplay(merged);
}

export function countCinemaVenuesWithShowtimes(venues: UtilityCinemaVenue[]): number {
  return venues.filter((venue) => venue.films.length > 0).length;
}
