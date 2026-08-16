import type {
  UtilityCinemaFilm,
  UtilityCinemaVenue,
  UtilityPharmacyEntry,
} from "./atlas-utility-sync.js";

export type PharmacyShiftFilter = "all" | "day" | "night" | "h24";
export type ClassifiedPharmacyShift = Exclude<PharmacyShiftFilter, "all">;
export type CinemaViewMode = "films" | "cinemas";

export interface PharmacyConsultationLinks {
  all: string;
  map?: string;
}

interface TimeSlot {
  start: number;
  end: number;
}

function parseTimeSlots(hoursToday?: string): TimeSlot[] {
  if (!hoursToday) return [];
  const slots: TimeSlot[] = [];
  for (const part of hoursToday.split(",")) {
    const match = part.trim().match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (!match) continue;
    const start = Number(match[1]) * 60 + Number(match[2]);
    let end = Number(match[3]) * 60 + Number(match[4]);
    if (end < start) end += 24 * 60;
    slots.push({ start, end });
  }
  return slots;
}

/** Classifica i turni farmacia dagli orari odierni (euristica su fascia oraria). */
export function classifyPharmacyShifts(
  hoursToday?: string,
): ClassifiedPharmacyShift[] | ["all"] {
  const slots = parseTimeSlots(hoursToday);
  if (slots.length === 0) return ["all"];

  const shifts = new Set<ClassifiedPharmacyShift>();
  const fullDay = slots.some(
    (slot) => slot.start <= 5 && slot.end >= 23 * 60 + 30,
  );
  if (fullDay) shifts.add("h24");

  const hasDay = slots.some(
    (slot) => slot.start < 20 * 60 && slot.end > 8 * 60,
  );
  const hasNight = slots.some(
    (slot) =>
      slot.start >= 20 * 60 ||
      slot.end >= 22 * 60 + 30 ||
      slot.end > 24 * 60,
  );

  if (hasDay) shifts.add("day");
  if (hasNight && !fullDay) shifts.add("night");

  if (shifts.size === 0) return ["all"];
  return [...shifts];
}

function isUnclassifiedPharmacyShift(
  shifts: ClassifiedPharmacyShift[] | ["all"],
): shifts is ["all"] {
  return shifts.length === 1 && shifts[0] === "all";
}

export function pharmacyMatchesShift(
  pharmacy: UtilityPharmacyEntry,
  shift: PharmacyShiftFilter,
): boolean {
  if (shift === "all") return true;
  const shifts = classifyPharmacyShifts(pharmacy.hoursToday);
  if (isUnclassifiedPharmacyShift(shifts)) return false;
  if (shift === "h24") return shifts.includes("h24");
  if (shift === "night") return shifts.includes("night") || shifts.includes("h24");
  if (shift === "day") return shifts.includes("day") || shifts.includes("h24");
  return true;
}

export function filterPharmacies(
  items: UtilityPharmacyEntry[],
  options: { shift?: PharmacyShiftFilter; query?: string },
): UtilityPharmacyEntry[] {
  const shift = options.shift ?? "all";
  const query = (options.query ?? "").trim().toLowerCase();

  return items.filter((pharmacy) => {
    if (!pharmacyMatchesShift(pharmacy, shift)) return false;
    if (!query) return true;
    const haystack = [pharmacy.name, pharmacy.municipality, pharmacy.address, pharmacy.phone]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}

export function buildCinemaVenues(films: UtilityCinemaFilm[]): UtilityCinemaVenue[] {
  const venues = new Map<string, UtilityCinemaVenue>();

  for (const film of films) {
    for (const showing of film.showings) {
      const key = `${showing.cinema}|${showing.town ?? ""}`;
      const existing = venues.get(key) ?? {
        cinema: showing.cinema,
        town: showing.town,
        url: showing.url,
        films: [],
      };

      const filmEntry = existing.films.find((entry) => entry.title === film.title);
      if (filmEntry) {
        filmEntry.times = [...new Set([...filmEntry.times, ...showing.times])];
      } else {
        existing.films.push({
          title: film.title,
          url: film.url,
          times: [...showing.times],
        });
      }

      venues.set(key, existing);
    }
  }

  return [...venues.values()].sort((a, b) => {
    const town = (a.town ?? "").localeCompare(b.town ?? "", "it");
    if (town !== 0) return town;
    return a.cinema.localeCompare(b.cinema, "it");
  });
}

export function listCinemaTowns(venues: UtilityCinemaVenue[]): string[] {
  return [...new Set(venues.map((venue) => venue.town).filter(Boolean) as string[])].sort((a, b) =>
    a.localeCompare(b, "it"),
  );
}

export function filterCinemaFilms(
  films: UtilityCinemaFilm[],
  query: string,
): UtilityCinemaFilm[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return films;

  return films
    .map((film) => {
      const showings = film.showings.filter((showing) => {
        const haystack = [film.title, showing.cinema, showing.town].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(normalized);
      });
      if (showings.length === 0 && !film.title.toLowerCase().includes(normalized)) return null;
      return { ...film, showings: showings.length > 0 ? showings : film.showings };
    })
    .filter((film): film is UtilityCinemaFilm => film !== null);
}

export function filterCinemaVenues(
  venues: UtilityCinemaVenue[],
  query: string,
): UtilityCinemaVenue[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return venues;

  return venues
    .map((venue) => {
      const haystack = [venue.cinema, venue.town].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(normalized)) return null;

      const films = venue.films.filter((film) => {
        const filmHaystack = [film.title, venue.cinema, venue.town].filter(Boolean).join(" ").toLowerCase();
        return filmHaystack.includes(normalized);
      });

      return { ...venue, films: films.length > 0 ? films : venue.films };
    })
    .filter((venue): venue is UtilityCinemaVenue => venue !== null);
}
