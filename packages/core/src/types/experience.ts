import type { AtlasPlaceStatus } from "../atlas-registry.js";
import type { EventCategory } from "./event.js";

export type ExperienceType =
  | "tour"
  | "tasting"
  | "food"
  | "activity"
  | "workshop"
  | "trail"
  | "lodging"
  | "other";
export type ExperiencePriceHint = "free" | "paid" | "mixed" | "unknown";
export type ExperienceRepeatability = "ongoing" | "seasonal" | "on_request";

export interface AtlasExperience {
  id: string;
  title: string;
  experience_type: ExperienceType;
  category: EventCategory;
  territory_id?: string | null;
  place_id?: string | null;
  municipality?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  description?: string | null;
  image_url?: string | null;
  info_url?: string | null;
  price_hint: ExperiencePriceHint;
  repeatability: ExperienceRepeatability;
  status: AtlasPlaceStatus;
  primary_source_id?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export function isExperiencePublished(experience: AtlasExperience): boolean {
  return experience.status === "active" || experience.status === "seasonal";
}
