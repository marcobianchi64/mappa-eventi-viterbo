import type {
  UtilityCinemaFilm,
  UtilityCinemaShowing,
  UtilityPharmacyEntry,
} from "@atlas/core";

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeHtml(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function parsePharmaciesFromPagineGialle(html: string): UtilityPharmacyEntry[] {
  const pharmacies: UtilityPharmacyEntry[] = [];
  const itemRe =
    /<div\s+class="search-itm card-listing[^"]*"[\s\S]*?(?=<div\s+class="search-itm card-listing|<\/section>|<footer)/g;

  for (const block of html.match(itemRe) ?? []) {
    const nameMatch = block.match(/class="[^"]*search-itm__rag[^"]*"[\s\S]*?>([\s\S]*?)<\/h2>/);
    const addrMatch = block.match(/class="search-itm__adr"[\s\S]*?<div\s*>([\s\S]*?)<\/div>/);
    const phoneMatch = block.match(/search-itm__phone-item">([^<]+)/);
    const urlMatch = block.match(/href="(https:\/\/www\.paginegialle\.it\/[^"#]+)"/);
    if (!nameMatch) continue;

    const name = decodeHtml(stripTags(nameMatch[1]));
    if (!name.toLowerCase().includes("farmacia")) continue;

    pharmacies.push({
      name,
      address: addrMatch ? decodeHtml(stripTags(addrMatch[1])) : undefined,
      phone: phoneMatch?.[1]?.trim(),
      url: urlMatch?.[1],
    });
  }

  return pharmacies;
}

export function parseCinemaFromMyMovies(html: string): UtilityCinemaFilm[] {
  const films: UtilityCinemaFilm[] = [];
  const parts = html.split(/<div id="poster-div-\d+"/);

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i]!;
    const titleFromLink = part.match(
      /<a href="(https:\/\/www\.mymovies\.it\/film\/[^"]+)" title="([^"]+)">([^<]+)<\/a>/,
    );
    const title = titleFromLink
      ? decodeHtml(stripTags(titleFromLink[3] ?? titleFromLink[2] ?? ""))
      : decodeHtml(part.match(/alt="Locandina ([^"]+)"/)?.[1] ?? "");
    const filmUrl = titleFromLink?.[1];
    if (!title) continue;

    const showings: UtilityCinemaShowing[] = [];
    const cinemaBlocks = [
      ...part.matchAll(
        /href="(https:\/\/www\.mymovies\.it\/cinema\/[^"]+)"[\s\S]*?font-weight:600;">([^<]+)<\/div>[\s\S]*?<span class="mm-small">([^<]*)<\/span>[\s\S]*?orari-dettaglio[\s\S]*?mm-weight-700">([^<]+)</g,
      ),
    ];

    for (const match of cinemaBlocks) {
      const cinema = stripTags(match[2] ?? "").replace(/^CINEMA\s+/i, "");
      const town = (match[3] ?? "").trim();
      const time = (match[4] ?? "").trim();
      if (!cinema || !time) continue;
      showings.push({
        cinema,
        town: town || undefined,
        times: [time],
        url: match[1],
      });
    }

    const merged = new Map<string, UtilityCinemaShowing>();
    for (const showing of showings) {
      const key = `${showing.cinema}|${showing.town ?? ""}`;
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, { ...showing, times: [...showing.times] });
      } else {
        existing.times.push(...showing.times);
      }
    }

    films.push({
      title,
      url: filmUrl,
      showings: [...merged.values()],
    });
  }

  return films;
}
