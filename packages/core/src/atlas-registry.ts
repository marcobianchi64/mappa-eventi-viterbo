/** Domini informativi Atlas (AIM). */
export type AtlasContentDomain =
  | "events"
  | "experiences"
  | "utilities"
  | "lodging"
  | "food";

export type AtlasPlaceType =
  | "cinema"
  | "pharmacy"
  | "theater"
  | "museum"
  | "municipality"
  | "pro_loco"
  | "restaurant"
  | "lodging"
  | "venue"
  | "other";

export type AtlasPlaceStatus = "active" | "seasonal" | "closed" | "unknown";

export type OperationalAlertType =
  | "coverage_gap"
  | "sync_failure"
  | "stale_data"
  | "place_silent"
  | "review_queue";

export type OperationalAlertSeverity = "info" | "warning" | "critical";

export interface PlaceExternalRefs {
  mymovies?: { slug?: string; venue_id?: string; url?: string };
  paginegialle?: { url?: string };
  comingsoon?: { url?: string };
  [key: string]: unknown;
}

/** Luogo censito — patrimonio riutilizzabile. */
export interface AtlasPlaceRegistryEntry {
  id: string;
  name: string;
  placeType: AtlasPlaceType;
  territoryId: string;
  municipality?: string;
  address?: string;
  screenCount?: number;
  status: AtlasPlaceStatus;
  primarySourceId?: string;
  externalRefs?: PlaceExternalRefs;
  matchNames?: string[];
  /** Comuni alternativi usati dalle fonti (es. Cura per Vetralla). */
  matchTowns?: string[];
  notes?: string;
}

export interface CoverageGap {
  placeId: string;
  placeName: string;
  municipality?: string;
  reason: string;
  severity: OperationalAlertSeverity;
}

export interface UtilityCoverageReport {
  domain: "cinema" | "pharmacy";
  expected: number;
  found: number;
  missing: CoverageGap[];
  checkedAt: string;
}

export interface OperationalAlertDraft {
  alertType: OperationalAlertType;
  severity: OperationalAlertSeverity;
  territoryId?: string;
  sourceId?: string;
  placeId?: string;
  title: string;
  message: string;
  details?: Record<string, unknown>;
}
