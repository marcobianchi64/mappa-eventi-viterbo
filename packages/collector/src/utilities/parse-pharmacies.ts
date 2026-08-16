import type { UtilityPharmacyEntry } from "@atlas/core";

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

function decodeAttributeJson(raw: string | undefined): Record<string, string[]> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw.replace(/&quot;/g, '"')) as Record<string, string[] | string>;
    const normalized: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (Array.isArray(value)) normalized[key] = value;
      else if (typeof value === "string" && value.trim()) normalized[key] = [value];
    }
    return normalized;
  } catch {
    return {};
  }
}

function formatPostalAddress(address?: {
  streetAddress?: string;
  postalCode?: string;
  addressLocality?: string;
}): string | undefined {
  if (!address) return undefined;
  const parts = [address.streetAddress, address.postalCode, address.addressLocality]
    .map((part) => part?.trim())
    .filter(Boolean);
  if (parts.length === 0) return undefined;
  const locality = address.addressLocality?.trim();
  const suffix = locality ? ` ${locality} (VT)` : "";
  if (address.streetAddress && address.postalCode) {
    return `${address.streetAddress} - ${address.postalCode}${suffix}`;
  }
  return `${parts.join(" - ")}${suffix}`;
}

function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  return phone.replace(/^\+39\s*/, "").trim();
}

function listingChunks(html: string): string[] {
  return html.split(/class="search-itm card-listing/).slice(1);
}

function pgDayKey(isoDate: string): string {
  const jsDay = new Date(`${isoDate}T12:00:00`).getDay();
  return String(((jsDay + 6) % 7) + 2);
}

function hoursForDay(hours: Record<string, string[]>, isoDate: string): string | undefined {
  const dateHours = hours[isoDate];
  if (dateHours?.length) return dateHours.join(", ");
  const dowHours = hours[pgDayKey(isoDate)];
  if (dowHours?.length) return dowHours.join(", ");
  return undefined;
}

function enrichPharmacyHours(
  pharmacies: UtilityPharmacyEntry[],
  html: string,
  dutyDate: string,
): UtilityPharmacyEntry[] {
  const chunks = listingChunks(html);

  return pharmacies.map((pharmacy) => {
    const slug = pharmacy.url?.split(".it/")[1]?.replace(/\/$/, "");
    const chunk = slug ? chunks.find((entry) => entry.includes(slug)) : undefined;
    if (!chunk) return pharmacy;

    const hours = decodeAttributeJson(chunk.match(/data-time="([^"]*)"/)?.[1]);
    const extra = decodeAttributeJson(chunk.match(/data-timeextra="([^"]*)"/)?.[1]);
    const merged = { ...hours, ...extra };
    const hoursToday = hoursForDay(merged, dutyDate);

    return hoursToday ? { ...pharmacy, hoursToday } : pharmacy;
  });
}

function parsePharmaciesFromJsonLd(html: string): UtilityPharmacyEntry[] {
  const blocks = [
    ...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ];

  for (const block of blocks) {
    try {
      const data = JSON.parse(block[1] ?? "");
      if (data["@type"] !== "ItemList" || !Array.isArray(data.itemListElement)) continue;
      if (data.itemListElement[0]?.item?.["@type"] !== "Pharmacy") continue;

      const pharmacies: UtilityPharmacyEntry[] = [];
      for (const listItem of data.itemListElement) {
        const item = listItem?.item;
        if (!item || item["@type"] !== "Pharmacy" || !item.name) continue;

        const phone = normalizePhone(
          item.contactPoint?.find((point: { telephone?: string }) => point.telephone)?.telephone,
        );

        pharmacies.push({
          name: item.name,
          address: formatPostalAddress(item.address),
          phone,
          url: item.url,
          municipality: item.address?.addressLocality,
        });
      }

      if (pharmacies.length > 0) return pharmacies;
    } catch {
      // try next block
    }
  }

  return [];
}

function parsePharmaciesFromHtmlListings(html: string): UtilityPharmacyEntry[] {
  const pharmacies: UtilityPharmacyEntry[] = [];

  for (const block of listingChunks(html)) {
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

export function getUtilityDutyDate(reference = new Date()): string {
  return reference.toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
}

export function parsePharmaciesFromPagineGialle(
  html: string,
  dutyDate: string = getUtilityDutyDate(),
): UtilityPharmacyEntry[] {
  const fromJsonLd = parsePharmaciesFromJsonLd(html);
  const base = fromJsonLd.length > 0 ? fromJsonLd : parsePharmaciesFromHtmlListings(html);
  return enrichPharmacyHours(base, html, dutyDate);
}
