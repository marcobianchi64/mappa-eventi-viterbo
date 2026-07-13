import type { EventCategory } from "./event.js";

export type SubmissionStatus = "pending" | "approved" | "rejected" | "duplicate";
export type ContactType = "email" | "whatsapp" | "phone" | "other";

export interface EventSubmissionInput {
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
  contact: string;
  contact_type?: ContactType;
  territory_id?: string | null;
}

export interface EventSubmissionRecord extends EventSubmissionInput {
  id: string;
  status: SubmissionStatus;
  duplicate_of_event_id?: string | null;
  review_notes?: string | null;
  created_at?: string;
  reviewed_at?: string | null;
}
