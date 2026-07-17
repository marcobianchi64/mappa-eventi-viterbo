import { createClient } from "@supabase/supabase-js";
import type { AtlasEvent } from "@atlas/core";

export interface GapReportOptions {
  supabaseUrl: string;
  serviceRoleKey: string;
  days?: number;
}

export interface GapReport {
  totalVerified: number;
  inWindow: number;
  byCategory: Record<string, number>;
  byComune: Record<string, number>;
  bySource: Record<string, number>;
  withoutComune: number;
}

export async function generateGapReport(options: GapReportOptions): Promise<GapReport> {
  const days = options.days ?? 60;
  const client = createClient(options.supabaseUrl, options.serviceRoleKey);

  const { data, error } = await client
    .from("events")
    .select("title,category,start_date,end_date,city,comune,source_id,verified,archived")
    .eq("verified", true)
    .eq("archived", false);

  if (error) throw new Error(error.message);

  const events = (data ?? []) as AtlasEvent[];
  const now = new Date();
  const to = new Date(now);
  to.setDate(to.getDate() + days);

  const inWindow = events.filter((e) => {
    const start = new Date(e.start_date);
    const end = e.end_date ? new Date(e.end_date) : start;
    if (end < now) return false;
    return start <= to;
  });

  const byCategory: Record<string, number> = {};
  const byComune: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  let withoutComune = 0;

  for (const e of inWindow) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + 1;
    const comune = (e.comune || e.city || "").trim();
    if (comune) byComune[comune] = (byComune[comune] ?? 0) + 1;
    else withoutComune += 1;
    const src = e.source_id ?? "unknown";
    bySource[src] = (bySource[src] ?? 0) + 1;
  }

  return {
    totalVerified: events.length,
    inWindow: inWindow.length,
    byCategory,
    byComune,
    bySource,
    withoutComune,
  };
}

export function formatGapReport(report: GapReport, days: number): string {
  const lines: string[] = [
    `=== Gap report Atlas (prossimi ${days} giorni) ===`,
    `Eventi verificati totali: ${report.totalVerified}`,
    `Eventi nel periodo:        ${report.inWindow}`,
    `Senza comune:              ${report.withoutComune}`,
    "",
    "Per categoria:",
  ];

  for (const [cat, count] of Object.entries(report.byCategory).sort((a, b) => b[1] - a[1])) {
    lines.push(`  ${cat}: ${count}`);
  }

  lines.push("", "Per comune (top 15):");
  const topComuni = Object.entries(report.byComune)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  for (const [comune, count] of topComuni) {
    lines.push(`  ${comune}: ${count}`);
  }

  lines.push("", "Per fonte:");
  for (const [src, count] of Object.entries(report.bySource).sort((a, b) => b[1] - a[1])) {
    lines.push(`  ${src}: ${count}`);
  }

  return lines.join("\n");
}
