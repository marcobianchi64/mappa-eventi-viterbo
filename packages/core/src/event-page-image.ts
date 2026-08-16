import { isHttpUrl } from "./safe-url.js";

/** Risolve URL relativi rispetto alla pagina evento. */
export function resolvePageAssetUrl(href: string, pageUrl: string): string | null {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("data:")) return null;
  try {
    if (trimmed.startsWith("//")) return `https:${trimmed}`;
    return new URL(trimmed, pageUrl).href;
  } catch {
    return null;
  }
}

function metaContent(html: string, key: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function jsonLdImages(html: string): string[] {
  const out: string[] = [];
  const blocks = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const block of blocks) {
    const raw = block[1]?.trim();
    if (!raw) continue;
    try {
      const data = JSON.parse(raw) as unknown;
      collectJsonLdImageUrls(data, out);
    } catch {
      /* ignore malformed JSON-LD */
    }
  }
  return out;
}

function collectJsonLdImageUrls(node: unknown, out: string[]): void {
  if (!node) return;
  if (typeof node === "string") {
    if (/^https?:\/\//i.test(node) || node.startsWith("//")) out.push(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) collectJsonLdImageUrls(item, out);
    return;
  }
  if (typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  if (obj["@type"] === "Event" || String(obj["@type"] ?? "").toLowerCase().includes("event")) {
    collectJsonLdImageUrls(obj.image, out);
  }
  if (obj.image) collectJsonLdImageUrls(obj.image, out);
}

function pickFirstValidImage(candidates: string[], pageUrl: string): string | null {
  for (const c of candidates) {
    const resolved = resolvePageAssetUrl(c, pageUrl);
    if (resolved && isHttpUrl(resolved)) return resolved;
  }
  return null;
}

/** Estrae la migliore immagine condivisibile da HTML di pagina evento (Open Graph, ecc.). */
export function extractEventImageFromHtml(html: string, pageUrl: string): string | null {
  const fromMeta = [
    metaContent(html, "og:image:secure_url"),
    metaContent(html, "og:image"),
    metaContent(html, "twitter:image"),
    metaContent(html, "twitter:image:src"),
  ].filter(Boolean) as string[];

  const fromLd = jsonLdImages(html);
  const imgTag = html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];

  return pickFirstValidImage([...fromMeta, ...fromLd, imgTag ?? ""].filter(Boolean), pageUrl);
}
