import { AUTO_SOURCES } from "./types.js";
import { collectFromSource } from "./collector.js";
import { SupabaseEventWriter } from "./writer.js";

export interface RunCollectorOptions {
  supabaseUrl: string;
  serviceRoleKey: string;
  sourceIds?: string[];
}

export interface RunCollectorReport {
  source_id: string;
  name: string;
  found: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export async function runCollector(options: RunCollectorOptions): Promise<RunCollectorReport[]> {
  const writer = new SupabaseEventWriter({
    url: options.supabaseUrl,
    serviceRoleKey: options.serviceRoleKey,
  });

  const sources = AUTO_SOURCES.filter((s) =>
    options.sourceIds?.length ? options.sourceIds.includes(s.id) : true,
  );

  const reports: RunCollectorReport[] = [];

  for (const source of sources) {
    console.log(`\n→ Raccolta: ${source.name}`);
    const collected = await collectFromSource(source);

    if (collected.errors.length) {
      console.warn("  Avvisi raccolta:", collected.errors.join("; "));
    }

    console.log(`  Eventi trovati: ${collected.events.length}`);

    if (collected.events.length === 0 && collected.errors.length) {
      reports.push({
        source_id: source.id,
        name: source.name,
        found: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: collected.errors,
      });
      continue;
    }

    const stats = await writer.syncSource(source, collected.events);
    console.log(
      `  Sync: +${stats.inserted} nuovi, ~${stats.updated} aggiornati, ${stats.skipped} saltati`,
    );

    reports.push({
      source_id: source.id,
      name: source.name,
      found: stats.found,
      inserted: stats.inserted,
      updated: stats.updated,
      skipped: stats.skipped,
      errors: [...collected.errors, ...stats.errors],
    });
  }

  return reports;
}

export { AUTO_SOURCES } from "./types.js";
