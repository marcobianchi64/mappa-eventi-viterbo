import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AtlasEvent, EventSubmission, ReviewStatus } from "@atlas/core";

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

export async function fetchVerifiedEvents(): Promise<AtlasEvent[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("verified", true)
    .order("start_date", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as AtlasEvent[];
}

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

export async function submitEvent(event: EventSubmission): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("events").insert({
    ...event,
    verified: false,
    review_status: "pending",
    source_id: null,
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
