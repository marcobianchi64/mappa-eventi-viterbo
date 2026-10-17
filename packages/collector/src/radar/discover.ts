import { createClient } from "@supabase/supabase-js";
import { fetchHtml } from "../connectors/fetch-html.js";
import { AUTO_SOURCES } from "../types.js";

export interface RadarDiscoverOptions {
  supabaseUrl: string;
  serviceRoleKey: string;
  territoryId: string;
  maxPages?: number;
  maxLinksPerPage?: number;
  seedUrls?: string[];
}

export interface RadarDiscoverResult {
  runId: string;
  pagesFetched: number;
  linksScored: number;
  candidatesUpserted: number;
  errors: string[];
}

const EVENT_PATH_RE =
  /(eventi|evento|sagre|sagra|calendario|manifestazioni|agenda|cosa-fare|in-programma)/i;

const SKIP_EXT_RE = /\.(pdf|zip|jpg|jpeg|png|gif|webp|doc|docx|xls|xlsx)(\?|$)/i;

export async function runRadarDiscover(options: RadarDiscoverOptions): Promise<RadarDiscoverResult> {
  const client = createClient(options.supabaseUrl, options.serviceRoleKey);
  const maxPages = options.maxPages ?? 8;
  const maxLinks = options.maxLinksPerPage ?? 40;
  const seeds = options.seedUrls ?? defaultSeeds();

  const { data: runRow, error: runErr } = await client
    .from("radar_runs")
    .insert({ territory_id: options.territoryId, status: "running" })
    .select("id")
    .single();

  if (runErr || !runRow) {
    throw new Error(runErr?.message ?? "Impossibile avviare radar_runs");
  }

  const runId = runRow.id as string;
  const errors: string[] = [];
  let pagesFetched = 0;
  let linksScored = 0;
  let candidatesUpserted = 0;

  const seenHosts = new Set<string>();

  for (const seed of seeds.slice(0, maxPages)) {
    try {
      const html = await fetchHtml(seed, { retries: 1 });
      pagesFetched += 1;
      const base = new URL(seed);
      const links = extractLinks(html, base);

      for (const link of links.slice(0, maxLinks)) {
        const score = scoreEventLink(link);
        if (score < 2) continue;
        linksScored += 1;

        const host = new URL(link.url).hostname;
        if (seenHosts.has(host) && score < 4) continue;

        const { error } = await client.from("source_candidates").upsert(
          {
            url: link.url,
            name: link.label?.slice(0, 200) ?? null,
            territory_id: options.territoryId,
            status: "new",
            discovered_from_url: seed,
            probe_score: score,
            metadata: { anchor_text: link.label, host },
          },
          { onConflict: "url" },
        );

        if (error) {
          errors.push(`${link.url}: ${error.message}`);
        } else {
          candidatesUpserted += 1;
          seenHosts.add(host);
        }
      }
    } catch (error) {
      errors.push(`${seed}: ${(error as Error).message}`);
    }
  }

  const status = errors.length && pagesFetched === 0 ? "error" : errors.length ? "partial" : "success";
  await client
    .from("radar_runs")
    .update({
      finished_at: new Date().toISOString(),
      status,
      pages_fetched: pagesFetched,
      links_scored: linksScored,
      candidates_upserted: candidatesUpserted,
      message: `Pagine ${pagesFetched}, candidati ${candidatesUpserted}`,
      details: { errors },
    })
    .eq("id", runId);

  return { runId, pagesFetched, linksScored, candidatesUpserted, errors };
}

function defaultSeeds(): string[] {
  const fromSources = AUTO_SOURCES.map((s) => s.page_url ?? s.feed_url).filter(Boolean) as string[];
  return [
    ...fromSources,
    "https://www.tusciaweb.eu/category/eventi/",
    "https://www.provincia.viterbo.it/",
    "https://comune.viterbo.it/vivere-il-comune/eventi/",
  ];
}

interface ScoredLink {
  url: string;
  label: string;
}

function extractLinks(html: string, base: URL): ScoredLink[] {
  const out: ScoredLink[] = [];
  const re = /<a\s[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const href = match[1].trim();
    if (!href || href.startsWith("mailto:") || href.startsWith("javascript:")) continue;
    let url: URL;
    try {
      url = new URL(href, base);
    } catch {
      continue;
    }
    if (!["http:", "https:"].includes(url.protocol)) continue;
    const label = stripTags(match[2]).replace(/\s+/g, " ").trim();
    out.push({ url: url.toString(), label });
  }
  return dedupeUrls(out);
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ");
}

function dedupeUrls(links: ScoredLink[]): ScoredLink[] {
  const map = new Map<string, ScoredLink>();
  for (const link of links) map.set(link.url, link);
  return [...map.values()];
}

function scoreEventLink(link: ScoredLink): number {
  let score = 0;
  const hay = `${link.url} ${link.label}`.toLowerCase();
  if (EVENT_PATH_RE.test(link.url)) score += 3;
  if (EVENT_PATH_RE.test(link.label)) score += 2;
  if (SKIP_EXT_RE.test(link.url)) score -= 5;
  if (hay.includes("facebook.com") || hay.includes("instagram.com")) score -= 3;
  if (link.url.includes("/feed") || link.url.endsWith(".xml")) score += 1;
  return score;
}
