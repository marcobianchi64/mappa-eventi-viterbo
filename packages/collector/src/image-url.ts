import { isHttpUrl } from "@atlas/core";

const USER_AGENT = "ProjectAtlas/1.0 (+https://github.com/marcobianchi64/mappa-eventi-viterbo)";

/** Verifica che l'URL risponda con un'immagine raggiungibile (HEAD, poi GET leggero). */
export async function isReachableImageUrl(url: string): Promise<boolean> {
  if (!isHttpUrl(url)) return false;
  const headers = { "User-Agent": USER_AGENT, Accept: "image/*,*/*;q=0.8" };

  try {
    const head = await fetch(url, {
      method: "HEAD",
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });
    if (head.ok) {
      const type = head.headers.get("content-type") ?? "";
      if (type.startsWith("image/")) return true;
    }
  } catch {
    /* alcuni host non supportano HEAD */
  }

  try {
    const get = await fetch(url, {
      method: "GET",
      headers: { ...headers, Range: "bytes=0-2047" },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });
    if (!get.ok) return false;
    const type = get.headers.get("content-type") ?? "";
    return type.startsWith("image/");
  } catch {
    return false;
  }
}
