import { extractEventImageFromHtml, isHttpUrl } from "@atlas/core";
import { fetchHtml } from "./connectors/fetch-html.js";

const ENRICH_DELAY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Scarica la pagina ufficiale e ricava l'URL immagine (Open Graph). */
export async function resolveEventImageFromUrl(eventUrl: string): Promise<string | null> {
  const url = eventUrl.trim();
  if (!isHttpUrl(url)) return null;
  const html = await fetchHtml(url);
  const image = extractEventImageFromHtml(html, url);
  return image && isHttpUrl(image) ? image : null;
}

/** Evita raffiche su siti Pro Loco durante import batch. */
export async function resolveEventImageFromUrlThrottled(
  eventUrl: string,
  delayMs = ENRICH_DELAY_MS,
): Promise<string | null> {
  if (delayMs > 0) await sleep(delayMs);
  try {
    return await resolveEventImageFromUrl(eventUrl);
  } catch {
    return null;
  }
}
