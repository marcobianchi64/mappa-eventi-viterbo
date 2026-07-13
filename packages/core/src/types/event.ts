export type EventCategory = "music" | "food" | "culture" | "other";

export type ReviewStatus = "pending" | "approved" | "rejected";

export type DateRangeKey = "today" | "tomorrow" | "weekend" | "7" | "15" | "30";

export interface AtlasEvent {
  date_event?: string;
  title: string;
  category: EventCategory;
  start_date: string;
  end_date?: string | null;
  venue?: string | null;
  event_url?: string | null;
  image_url?: string | null;
  description?: string | null;
  lat: number;
  lng: number;
  verified: boolean;
  review_status: ReviewStatus;
  source_id?: string | null;
  province?: string | null;
  city?: string | null;
  comune?: string | null;
  location?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface EventSubmission {
  title: string;
  category: EventCategory;
  start_date: string;
  end_date?: string | null;
  venue?: string | null;
  event_url?: string | null;
  image_url?: string | null;
  description?: string | null;
  lat: number;
  lng: number;
}

export interface SavedInterest {
  id: string;
  title: string;
  start_date: string | null;
  venue: string;
  lat: number;
  lng: number;
  event_url: string;
  saved_at: string;
  reminder: "day_before";
}

export interface DateRangeWindow {
  from: Date;
  to: Date;
}

export interface CategoryMeta {
  label: string;
  color: string;
  icon: string;
}
