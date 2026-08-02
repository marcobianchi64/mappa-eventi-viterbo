#!/usr/bin/env node
/**
 * Scarica cover segnaposto atmosferiche da fonti libere (Pexels + Wikimedia).
 * Cerca scene tipo festa di paese / cena all'aperto — non foto letterali (pesce, dolci…).
 *
 * Uso:
 *   npm run fetch:covers
 *   npm run fetch:covers -- --force
 *   npm run fetch:covers -- --force --only=food,culture
 *
 * Opzionale: PEXELS_API_KEY in packages/collector/.env
 */
import { mkdir, writeFile, access, readFile, copyFile, unlink } from "node:fs/promises";
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

/** Solo food, culture, music — le altre categorie usano icona in app. */
const CATEGORIES = {
  music: [
    "live band group on stage concert",
    "musical group performance outdoor",
    "rock band concert stage lights",
    "jazz band live performance",
  ],
  food: [
    "outdoor food festival evening crowd",
    "street food market night",
    "wine festival tables outdoor",
    "food fair outdoor gathering",
    "night market food stalls",
  ],
  culture: [
    "theatre interior audience performance",
    "lecture hall audience speaker",
    "conference speaker audience podium",
    "amphitheater lecture crowd",
    "cultural event stage audience",
    "university lecture audience",
    "auditorium evening speaker audience",
  ],
};

const GLOBAL_EXCLUDE =
  /memorial|crush|tragedy|disaster|death|funeral|accident|war|protest riot/i;

const CATEGORY_EXCLUDE = {
  food: /fish|seafood|pesce|salmone|tuna|sushi|dessert|cake|sweet|dolce|gelato|pastry|biscuit|cookie|couscous|pizza close|macro food|menu of a restaurant|food menu/i,
  music: /museum gallery painting|marathon|audience only|empty stage/i,
  culture:
    /marathon|football|recipe|dessert|museum exterior only|painting only|sculpture only|stage actor \(sayre|mardi gras press|contact sheet|ford a10|bundesarchiv bild 183-j|cruikshank|king john at drury|bolshoi theatre\.jpg|globe theatre - geograph|marquee - ellen|presenter targus|news presenter|secretary of defense|secretary of the navy|rumsfeld|nancy pelosi/i,
};

const PREFER_HINTS = {
  music: /band|group|musician|ensemble|orchestra|jazz|rock|live|concert|stage/i,
  food: /festival|dinner|table|wine|outdoor|terrace|gathering|piazza|market|evening|lights|crowd|sagra/i,
  culture:
    /audience|theater|theatre|lecture|speaker|presenter|podium|stage|conference|platea|conferenza|performance|interior|publik|hörsaal|hoersaal|amphitheater/i,
};

const pexelsKey = process.env.PEXELS_API_KEY?.trim();
const force = process.argv.includes("--force");
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const onlyCats = onlyArg
  ? onlyArg
      .split("=")[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : null;

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
        headers: { "User-Agent": "ProjectAtlas/1.0 (cover-placeholder-fetch)" },
        redirect: "follow",
      });
      if (res.status === 429) {
        await sleep(DELAY_MS * (attempt + 2));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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

function scoreCandidate(category, title) {
  const t = (title ?? "").toLowerCase();
  if (GLOBAL_EXCLUDE.test(t)) return -1;
  if (CATEGORY_EXCLUDE[category]?.test(t)) return -1;
  let score = 0;
  if (PREFER_HINTS[category]?.test(t)) score += 3;
  if (/evening|night|lights|festival|crowd|outdoor|piazza|gathering|terrace/.test(t)) score += 2;
  if (category === "culture" && /audience|speaker|lecture|publik|presenter|conferenza/.test(t)) score += 2;
  if (category === "culture" && !/audience|speaker|lecture|publik|presenter|conferenza|interior/.test(t)) {
    score = Math.min(score, 2);
  }
  if (category === "culture" && /plate 0|microcosm|engraving|illustration|\.png$/.test(t)) score -= 4;
  if (category === "food" && /menu|sign|text only/.test(t)) score -= 3;
  if (/portrait|logo|diagram|map|chart|icon|screenshot/.test(t)) score -= 3;
  return score;
}

async function searchWikimedia(query) {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: `filetype:bitmap ${query}`,
    gsrnamespace: "6",
    gsrlimit: "40",
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
    const title = page.title?.replace(/^File:/, "") ?? query;
    const license =
      info.extmetadata?.LicenseShortName?.value ??
      info.extmetadata?.UsageTerms?.value ??
      "CC (Wikimedia)";
    out.push({
      source: "wikimedia",
      url: info.thumburl || info.url,
      title,
      license: license.replace(/<[^>]+>/g, "").trim(),
      pageUrl: info.descriptionurl ?? "",
    });
  }
  return out;
}

async function searchWikimediaForCategory(category, query) {
  const batch = await searchWikimedia(query);
  return batch
    .map((item) => ({ ...item, score: scoreCandidate(category, item.title) }))
    .filter((item) => item.score >= 0);
}

async function searchPexels(query, category) {
  if (!pexelsKey) return [];
  const params = new URLSearchParams({ query, per_page: "20", orientation: "landscape" });
  const res = await fetch(`https://api.pexels.com/v1/search?${params}`, {
    headers: { Authorization: pexelsKey },
  });
  if (!res.ok) throw new Error(`Pexels API ${res.status}`);
  const data = await res.json();
  return (data.photos ?? [])
    .map((p) => {
      const title = p.alt || query;
      const score = scoreCandidate(category, title);
      if (score < 0) return null;
      return {
        source: "pexels",
        url: p.src?.large || p.src?.medium,
        title,
        license: "Pexels License",
        pageUrl: p.url ?? "",
        photographer: p.photographer ?? "",
        score: score + 1,
      };
    })
    .filter(Boolean);
}

async function collectCandidates(category, queries) {
  const seen = new Set();
  const all = [];
  for (const q of queries) {
    for (const src of [
      () => searchPexels(q, category),
      () => searchWikimediaForCategory(category, q),
    ]) {
      try {
        const batch = await src();
        for (const item of batch) {
          if (!item?.url || seen.has(item.url)) continue;
          seen.add(item.url);
          all.push({ ...item, category, query: q });
        }
      } catch (e) {
        console.warn(`  avviso (${q}): ${e.message}`);
      }
      await sleep(DELAY_MS);
    }
  }
  all.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return all;
}

async function main() {
  const manifest = { fetchedAt: new Date().toISOString(), categories: {} };
  const entries = Object.entries(CATEGORIES).filter(
    ([cat]) => !onlyCats || onlyCats.includes(cat),
  );

  for (const [category, queries] of entries) {
    const dir = join(OUT_DIR, category);
    await mkdir(dir, { recursive: true });
    console.log(`\n→ ${category}`);

    const candidates = await collectCandidates(category, queries);
    const minScore = category === "food" || category === "music" ? 2 : 3;
    const ranked = candidates.filter((c) => (c.score ?? 0) >= minScore);
    if (ranked.length < PER_CATEGORY) {
      console.warn(
        `  ${ranked.length} candidati con score≥${minScore} — considera PEXELS_API_KEY o rilancia`,
      );
    }
    manifest.categories[category] = [];

    const usedTitles = new Set();
    let pickIndex = 0;
    const pool = ranked;
    for (let i = 0; i < PER_CATEGORY; i++) {
      const num = String(i + 1).padStart(2, "0");
      const dest = join(dir, `${num}.jpg`);
      const tmpDest = join(dir, `${num}.tmp.jpg`);
      if (await exists(dest) && !force) {
        console.log(`  ${num}.jpg già presente, salto`);
        manifest.categories[category].push({ file: `${category}/${num}.jpg`, skipped: true });
        continue;
      }
      let saved = false;
      while (pickIndex < pool.length && !saved) {
        const item = pool[pickIndex++];
        const titleKey = item.title.slice(0, 28).toLowerCase();
        if (usedTitles.has(titleKey)) continue;
        if ((item.score ?? 0) < minScore) continue;
        try {
          await download(item.url, tmpDest);
          if (force && (await exists(dest))) await unlink(dest).catch(() => {});
          const { rename } = await import("node:fs/promises");
          await rename(tmpDest, dest);
          manifest.categories[category].push({
            file: `${category}/${num}.jpg`,
            source: item.source,
            title: item.title,
            score: item.score,
            license: item.license,
            pageUrl: item.pageUrl,
            photographer: item.photographer ?? null,
          });
          console.log(`  ${num}.jpg ← ${item.source} [${item.score}]: ${item.title.slice(0, 44)}…`);
          usedTitles.add(titleKey);
          saved = true;
        } catch (e) {
          await unlink(tmpDest).catch(() => {});
          console.warn(`  ${num}.jpg tentativo fallito: ${e.message}`);
        }
        await sleep(DELAY_MS);
      }
      if (!saved) {
        const fallback = join(dir, "01.jpg");
        if (await exists(fallback)) {
          await copyFile(fallback, dest);
          console.log(`  ${num}.jpg ← copia variante da 01.jpg (pool esaurito)`);
          manifest.categories[category].push({ file: `${category}/${num}.jpg`, copiedFrom: "01.jpg" });
        } else {
          console.warn(`  ${num}.jpg — nessun candidato riuscito`);
        }
      }
    }
  }

  const manifestPath = join(OUT_DIR, "manifest.json");
  await writeFile(
    manifestPath,
    JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        categories: manifest.categories,
        note: "Scene evocative; tinta CSS in app (duotone evanescente)",
      },
      null,
      2,
    ),
  );
  console.log(`\nCompletato. Manifest: apps/web/public/covers/manifest.json`);
  if (!pexelsKey) {
    console.log("Suggerimento: PEXELS_API_KEY migliora molto la coerenza tematica");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
