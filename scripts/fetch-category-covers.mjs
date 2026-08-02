#!/usr/bin/env node
/**
 * Scarica cover segnaposto da fonti libere (Wikimedia Commons; opzionale Pexels).
 * Uso: npm run fetch:covers
 * Opzionale: PEXELS_API_KEY in packages/collector/.env o env
 */
import { mkdir, writeFile, access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "apps/web/public/covers");
const PER_CATEGORY = 10;
const DELAY_MS = 2500;
const MAX_RETRIES = 4;

config({ path: join(ROOT, "packages/collector/.env") });

const CATEGORIES = {
  music: ["live concert festival", "orchestra performance", "jazz club", "outdoor music stage"],
  food: ["italian food table", "wine tasting", "farmers market food", "pasta restaurant"],
  culture: ["art museum gallery", "theater stage", "historic church interior", "book reading"],
  sport: ["marathon running", "cycling race", "football stadium", "tennis court"],
  families: ["family picnic park", "children playground", "family beach", "parents children park"],
  other: ["street festival celebration", "outdoor market square", "town fair lights", "community parade"],
};

const pexelsKey = process.env.PEXELS_API_KEY?.trim();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function download(url, dest) {
  let lastErr;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "ProjectAtlas/1.0 (cover-placeholder-fetch; educational)" },
        redirect: "follow",
      });
      if (res.status === 429) {
        await sleep(DELAY_MS * (attempt + 2));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} per ${url}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(dest, buf);
      return;
    } catch (e) {
      lastErr = e;
      await sleep(DELAY_MS * (attempt + 1));
    }
  }
  throw lastErr ?? new Error(`Download fallito: ${url}`);
}

async function searchWikimedia(query) {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: `filetype:bitmap ${query}`,
    gsrnamespace: "6",
    gsrlimit: "30",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "960",
    format: "json",
    origin: "*",
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`);
  if (!res.ok) throw new Error(`Wikimedia API ${res.status}`);
  const data = await res.json();
  const pages = data?.query?.pages ?? {};
  const out = [];
  for (const page of Object.values(pages)) {
    const info = page.imageinfo?.[0];
    if (!info?.thumburl && !info?.url) continue;
    const license =
      info.extmetadata?.LicenseShortName?.value ??
      info.extmetadata?.UsageTerms?.value ??
      "CC (Wikimedia)";
    out.push({
      source: "wikimedia",
      url: info.thumburl || info.url,
      title: page.title?.replace(/^File:/, "") ?? query,
      license: license.replace(/<[^>]+>/g, "").trim(),
      pageUrl: info.descriptionurl ?? "",
    });
  }
  return out;
}

async function searchPexels(query) {
  if (!pexelsKey) return [];
  const params = new URLSearchParams({ query, per_page: "15", orientation: "landscape" });
  const res = await fetch(`https://api.pexels.com/v1/search?${params}`, {
    headers: { Authorization: pexelsKey },
  });
  if (!res.ok) throw new Error(`Pexels API ${res.status}`);
  const data = await res.json();
  return (data.photos ?? []).map((p) => ({
    source: "pexels",
    url: p.src?.large || p.src?.medium,
    title: p.alt || query,
    license: "Pexels License",
    pageUrl: p.url ?? "",
    photographer: p.photographer ?? "",
  }));
}

async function collectCandidates(category, queries) {
  const seen = new Set();
  const all = [];
  for (const q of queries) {
    for (const src of [() => searchPexels(q), () => searchWikimedia(q)]) {
      try {
        const batch = await src();
        for (const item of batch) {
          if (!item.url || seen.has(item.url)) continue;
        const titleLower = (item.title ?? "").toLowerCase();
        if (/memorial|crush|tragedy|disaster|death|funeral/.test(titleLower)) continue;
        seen.add(item.url);
          all.push({ ...item, category, query: q });
        }
      } catch (e) {
        console.warn(`  avviso (${q}): ${e.message}`);
      }
      await sleep(DELAY_MS);
    }
    if (all.length >= PER_CATEGORY * 2) break;
  }
  return all;
}

async function main() {
  const manifest = { fetchedAt: new Date().toISOString(), categories: {} };

  for (const [category, queries] of Object.entries(CATEGORIES)) {
    const dir = join(OUT_DIR, category);
    await mkdir(dir, { recursive: true });
    console.log(`\n→ ${category}`);

    const candidates = await collectCandidates(category, queries);
    const picked = candidates.slice(0, PER_CATEGORY * 3);
    manifest.categories[category] = [];

    let pickIndex = 0;
    for (let i = 0; i < PER_CATEGORY; i++) {
      const num = String(i + 1).padStart(2, "0");
      const dest = join(dir, `${num}.jpg`);
      if (await exists(dest) && !process.argv.includes("--force")) {
        console.log(`  ${num}.jpg già presente, salto`);
        manifest.categories[category].push({ file: `${category}/${num}.jpg`, skipped: true });
        continue;
      }
      let saved = false;
      while (pickIndex < picked.length && !saved) {
        const item = picked[pickIndex++];
        if (!item) break;
        try {
          await download(item.url, dest);
          manifest.categories[category].push({
            file: `${category}/${num}.jpg`,
            source: item.source,
            title: item.title,
            license: item.license,
            pageUrl: item.pageUrl,
            photographer: item.photographer ?? null,
          });
          console.log(`  ${num}.jpg ← ${item.source}: ${item.title.slice(0, 48)}…`);
          saved = true;
        } catch (e) {
          console.warn(`  ${num}.jpg tentativo fallito: ${e.message}`);
        }
        await sleep(DELAY_MS);
      }
      if (!saved) {
        console.warn(`  ${num}.jpg — nessun candidato riuscito`);
      }
    }
  }

  const manifestPath = join(OUT_DIR, "manifest.json");
  let prev = {};
  try {
    prev = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    /* primo run */
  }
  await writeFile(
    manifestPath,
    JSON.stringify({ ...prev, ...manifest, note: "Cover segnaposto — licenze in categories[].license" }, null, 2),
  );
  console.log(`\nCompletato. Manifest: apps/web/public/covers/manifest.json`);
  if (!pexelsKey) {
    console.log("Suggerimento: imposta PEXELS_API_KEY per più scelta (gratis su pexels.com/api)");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
