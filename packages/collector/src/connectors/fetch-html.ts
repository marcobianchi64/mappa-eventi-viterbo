const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export interface FetchHtmlOptions {
  retries?: number;
}

function isBlockedChallenge(html: string): boolean {
  return html.includes("AwsWafIntegration") || html.length < 10_000;
}

export async function fetchHtml(url: string, options: FetchHtmlOptions = {}): Promise<string> {
  const retries = options.retries ?? 0;
  let lastHtml = "";

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "it-IT,it;q=0.9",
      },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} per ${url}`);

    lastHtml = await response.text();
    if (!isBlockedChallenge(lastHtml)) return lastHtml;

    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
    }
  }

  if (isBlockedChallenge(lastHtml)) {
    throw new Error(`Pagina bloccata o vuota per ${url}`);
  }

  return lastHtml;
}
