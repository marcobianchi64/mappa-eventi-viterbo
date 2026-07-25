import { createClient } from "@supabase/supabase-js";
import {
  compareMapRegistryFromEvents,
  formatCompareReport,
  type CompareMapRegistryReport,
} from "@atlas/core";

export type { CompareEventRow, CompareMapRegistryReport } from "@atlas/core";
export { compareMapRegistryFromEvents, formatCompareReport } from "@atlas/core";

export interface CompareMapRegistryOptions {
  supabaseUrl: string;
  serviceRoleKey: string;
  anonKey?: string;
  rangeDays?: "60" | "30" | "15";
}

export async function compareMapRegistry(
  options: CompareMapRegistryOptions,
): Promise<CompareMapRegistryReport> {
  const range = options.rangeDays ?? "60";
  const client = createClient(options.supabaseUrl, options.serviceRoleKey);

  const { data, error } = await client
    .from("events")
    .select("*")
    .order("start_date", { ascending: true });

  if (error) throw new Error(error.message);

  const all = data ?? [];
  let publicEvents: typeof all | undefined;

  if (options.anonKey) {
    const anon = createClient(options.supabaseUrl, options.anonKey);
    const { data: pubData, error: pubError } = await anon
      .from("events")
      .select("*")
      .eq("verified", true)
      .order("start_date", { ascending: true });

    if (pubError) throw new Error(`API pubblica (anon): ${pubError.message}`);
    publicEvents = (pubData ?? []).filter((e) => e.archived !== true);
  }

  return compareMapRegistryFromEvents(all, { rangeDays: range, publicEvents });
}
