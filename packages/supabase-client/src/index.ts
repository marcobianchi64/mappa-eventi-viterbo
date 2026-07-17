import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AtlasEvent,
  AtlasSource,
  EventSubmissionInput,
  EventSubmissionRecord,
  ReviewStatus,
  SourceInput,
} from "@atlas/core";

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

let client: SupabaseClient | null = null;

export function initSupabaseClient(config: SupabaseConfig): SupabaseClient {
  client = createClient(config.url, config.anonKey);
  return client;
}

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    throw new Error("Supabase non inizializzato. Chiama initSupabaseClient() all'avvio dell'app.");
  }
  return client;
}

export function resetSupabaseClient(): void {
  client = null;
}

// ---------------------------------------------------------------------------
// Eventi pubblici
// ---------------------------------------------------------------------------

export async function fetchVerifiedEvents(): Promise<AtlasEvent[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("verified", true)
    .order("start_date", { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as AtlasEvent[]).filter((e) => e.archived !== true);
}

export async function fetchEventById(id: string): Promise<AtlasEvent | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("date_event", id)
    .eq("verified", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const event = (data as AtlasEvent | null) ?? null;
  if (event?.archived === true) return null;
  return event;
}

// ---------------------------------------------------------------------------
// Moderazione eventi
// ---------------------------------------------------------------------------

export async function fetchPendingEvents(): Promise<AtlasEvent[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("review_status", "pending")
    .order("start_date", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as AtlasEvent[];
}

export async function fetchAllEventsAdmin(limit = 200): Promise<AtlasEvent[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("start_date", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as AtlasEvent[];
}

export async function createEventAdmin(
  event: Partial<AtlasEvent> & {
    title: string;
    category: string;
    start_date: string;
    lat: number;
    lng: number;
    source_id: string;
  },
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("events").insert({
    ...event,
    verified: event.verified ?? true,
    review_status: event.review_status ?? "approved",
    archived: false,
  });

  if (error) throw new Error(error.message);
}

export async function updateEventReview(
  id: string,
  verified: boolean,
  reviewStatus: ReviewStatus,
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("events")
    .update({ verified, review_status: reviewStatus })
    .eq("date_event", id);

  if (error) throw new Error(error.message);
}

export async function archiveEvent(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("events").update({ archived: true }).eq("date_event", id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Segnalazioni utenti
// ---------------------------------------------------------------------------

export async function submitUserReport(input: EventSubmissionInput): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("event_submissions").insert({
    ...input,
    status: "pending",
  });

  if (error) throw new Error(error.message);
}

export async function fetchPendingSubmissions(): Promise<EventSubmissionRecord[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("event_submissions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as EventSubmissionRecord[];
}

export async function updateSubmissionStatus(
  id: string,
  status: EventSubmissionRecord["status"],
  reviewNotes?: string,
  duplicateOfEventId?: string,
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("event_submissions")
    .update({
      status,
      review_notes: reviewNotes ?? null,
      duplicate_of_event_id: duplicateOfEventId ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function approveSubmissionAsEvent(
  submission: EventSubmissionRecord,
  sourceId = "src-user-reports",
): Promise<void> {
  const supabase = getSupabaseClient();

  const { error: eventError } = await supabase.from("events").insert({
    title: submission.title,
    category: submission.category,
    start_date: submission.start_date,
    end_date: submission.end_date,
    venue: submission.venue,
    event_url: submission.event_url,
    image_url: submission.image_url,
    description: submission.description,
    lat: submission.lat,
    lng: submission.lng,
    verified: true,
    review_status: "approved",
    source_id: sourceId,
    territory_id: submission.territory_id ?? "IT-VT",
    archived: false,
  });

  if (eventError) throw new Error(eventError.message);

  await updateSubmissionStatus(submission.id, "approved", "Pubblicato da segnalazione");
}

// ---------------------------------------------------------------------------
// Fonti
// ---------------------------------------------------------------------------

export async function fetchSources(): Promise<AtlasSource[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("sources")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as AtlasSource[];
}

export async function createSource(input: SourceInput): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("sources").insert({
    ...input,
    status: input.status ?? "active",
    update_frequency: input.update_frequency ?? "daily",
  });

  if (error) throw new Error(error.message);
}

export async function updateSource(id: string, patch: Partial<SourceInput>): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("sources").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Auth admin
// ---------------------------------------------------------------------------

export async function signInWithOtp(email: string, redirectTo: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw new Error(error.message);
}

export async function getSession() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  return data.session;
}

/** @deprecated Usa submitUserReport — mantenuto per compatibilità legacy */
export async function submitEvent(event: {
  title: string;
  category: string;
  start_date: string;
  end_date?: string | null;
  venue?: string | null;
  event_url?: string | null;
  image_url?: string | null;
  description?: string | null;
  lat: number;
  lng: number;
}): Promise<void> {
  await submitUserReport({
    ...event,
    category: event.category as EventSubmissionInput["category"],
    contact: "legacy@atlas.local",
    contact_type: "other",
    territory_id: "IT-VT",
  });
}
