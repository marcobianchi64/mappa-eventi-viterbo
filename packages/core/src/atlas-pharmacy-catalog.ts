import type { AtlasPlaceRegistryEntry } from "./atlas-registry.js";
import type { UtilityPharmacyEntry } from "./atlas-utility-sync.js";
import { ATLAS_PHARMACY_PLACES_VT_DATA } from "./atlas-pharmacy-catalog.generated.js";

/** Anagrafica Ministero della Salute: farmacie attive della provincia di Viterbo. */
export const ATLAS_PHARMACY_PLACES_VT: AtlasPlaceRegistryEntry[] = ATLAS_PHARMACY_PLACES_VT_DATA;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\bfarmacia\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function pharmacyMatchesPlace(
  pharmacy: UtilityPharmacyEntry,
  place: AtlasPlaceRegistryEntry,
): boolean {
  const sourceUrl = place.externalRefs?.paginegialle?.url;
  if (sourceUrl && pharmacy.url === sourceUrl) return true;

  if (normalize(pharmacy.municipality ?? "") !== normalize(place.municipality ?? "")) return false;
  const names = [place.name, ...(place.matchNames ?? [])].map(normalize);
  const observedName = normalize(pharmacy.name);
  return names.some((name) => name === observedName);
}

/** Collega una farmacia di turno al registro nazionale, senza alterare la lista del turno. */
export function attachPharmacyPlaceIds(
  pharmacies: UtilityPharmacyEntry[],
  registry: AtlasPlaceRegistryEntry[] = ATLAS_PHARMACY_PLACES_VT,
): UtilityPharmacyEntry[] {
  return pharmacies.map((pharmacy) => {
    const place = registry.find((candidate) => pharmacyMatchesPlace(pharmacy, candidate));
    if (!place) return pharmacy;
    return { ...pharmacy, placeId: place.id, placeStatus: place.status };
  });
}

/** Osservazioni di turno non ancora riconciliate con il registro autorevole. */
export function findUnmatchedDutyPharmacies(
  pharmacies: UtilityPharmacyEntry[],
): UtilityPharmacyEntry[] {
  return pharmacies.filter((pharmacy) => !pharmacy.placeId);
}
