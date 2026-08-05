import type { AtlasEdition } from "./atlas-edition.js";
import { ATLAS_EDITION } from "./atlas-edition.js";
import type { AtlasGeoContext } from "./atlas-geo.js";

/** Servizi di utilità oltre gli eventi (link esterni oggi; sync/collector in futuro). */
export type AtlasUtilityServiceKind =
  | "pharmacy_duty"
  | "cinema_listings"
  | "cinema_booking";

export type AtlasUtilityServiceMode = "external_link" | "external_link_sync_planned" | "atlas_sync_planned";

export type AtlasUtilityResolution = "national" | "region" | "province" | "municipality";

export interface AtlasUtilityServiceDefinition {
  id: string;
  kind: AtlasUtilityServiceKind;
  label: string;
  description: string;
  provider: string;
  resolution: AtlasUtilityResolution;
  /** Placeholder: {region_slug}, {province_slug}, {municipality_slug}, {municipality_name} */
  urlTemplate: string;
  icon: string;
  mode: AtlasUtilityServiceMode;
  /** Override URL assoluto per territory_id (es. IT-VT) */
  territoryUrlOverrides?: Record<string, string>;
}

export interface AtlasUtilityServiceLink {
  id: string;
  kind: AtlasUtilityServiceKind;
  label: string;
  description: string;
  provider: string;
  url: string;
  icon: string;
  mode: AtlasUtilityServiceMode;
  openInNewTab: true;
}

const PLACEHOLDER_PATTERN = /\{([a-z_]+)\}/g;

/** Catalogo nazionale: nuove province/regioni = stesso codice, altro geo in edition. */
export const ATLAS_UTILITY_SERVICE_CATALOG: AtlasUtilityServiceDefinition[] = [
  {
    id: "pharmacy-duty-pg-region",
    kind: "pharmacy_duty",
    label: "Farmacie di turno",
    description: "Turni aggiornati su Pagine Gialle per la tua area.",
    provider: "Pagine Gialle",
    resolution: "region",
    urlTemplate: "https://www.paginegialle.it/farmacie-turno/{region_slug}",
    icon: "💊",
    mode: "external_link",
    territoryUrlOverrides: {
      "IT-VT": "https://www.paginegialle.it/farmacie-turno/lazio",
    },
  },
  {
    id: "pharmacy-duty-pg-national",
    kind: "pharmacy_duty",
    label: "Farmacie di turno (Italia)",
    description: "Cerca per comune su tutto il territorio nazionale.",
    provider: "Pagine Gialle",
    resolution: "national",
    urlTemplate: "https://www.paginegialle.it/farmacie-turno",
    icon: "🇮🇹",
    mode: "external_link",
  },
  {
    id: "cinema-listings-mymovies-province",
    kind: "cinema_listings",
    label: "Programmazione cinema",
    description: "Film in sala nella provincia (MYmovies).",
    provider: "MYmovies",
    resolution: "province",
    urlTemplate: "https://www.mymovies.it/cinema/{province_slug}/provincia/",
    icon: "🎬",
    mode: "external_link_sync_planned",
    territoryUrlOverrides: {
      "IT-VT": "https://www.mymovies.it/cinema/viterbo/provincia/",
    },
  },
  {
    id: "cinema-booking-thespace",
    kind: "cinema_booking",
    label: "Prenota al cinema",
    description: "Biglietti e posti — The Space Cinema (rete nazionale).",
    provider: "The Space Cinema",
    resolution: "national",
    urlTemplate: "https://www.thespacecinema.it/",
    icon: "🎟",
    mode: "external_link",
  },
  {
    id: "cinema-booking-comingsoon",
    kind: "cinema_booking",
    label: "Prevendita cinema",
    description: "Prenotazione ComingSoon (estensione per sedi locali).",
    provider: "ComingSoon",
    resolution: "municipality",
    urlTemplate: "https://www.comingsoon.it/cinema/{municipality_slug}/",
    icon: "🎫",
    mode: "external_link_sync_planned",
  },
];

/** Servizi attivi per edizione (ordine UI). Estendere per deploy nazionale senza cambiare UI. */
export const ATLAS_EDITION_UTILITY_SERVICE_IDS: Record<string, string[]> = {
  viterbo: [
    "pharmacy-duty-pg-region",
    "cinema-listings-mymovies-province",
    "cinema-booking-thespace",
  ],
  default: ["pharmacy-duty-pg-national", "cinema-listings-mymovies-province", "cinema-booking-thespace"],
};

function interpolateTemplate(template: string, geo: AtlasGeoContext): string {
  const map: Record<string, string | undefined> = {
    region_slug: geo.regionSlug,
    province_slug: geo.provinceSlug,
    province_code: geo.provinceCode?.toLowerCase(),
    municipality_slug: geo.municipalitySlug,
    municipality_name: geo.municipalityName,
    country_code: geo.countryCode.toLowerCase(),
  };

  return template.replace(PLACEHOLDER_PATTERN, (_match, key: string) => {
    const value = map[key];
    if (!value) {
      throw new Error(`Missing geo placeholder {${key}} for utility URL`);
    }
    return encodeURIComponent(value).replace(/%20/g, "+");
  });
}

export function resolveUtilityServiceUrl(
  definition: AtlasUtilityServiceDefinition,
  edition: AtlasEdition,
): string | null {
  const override = definition.territoryUrlOverrides?.[edition.territoryId];
  if (override) return override;

  const geo = edition.geo;
  if (!geo) return definition.resolution === "national" ? definition.urlTemplate : null;

  try {
    if (definition.resolution === "national") {
      return definition.urlTemplate;
    }
    return interpolateTemplate(definition.urlTemplate, geo);
  } catch {
    return null;
  }
}

export function getUtilityServicesForEdition(
  edition: AtlasEdition = ATLAS_EDITION,
): AtlasUtilityServiceLink[] {
  const ids =
    ATLAS_EDITION_UTILITY_SERVICE_IDS[edition.id] ??
    ATLAS_EDITION_UTILITY_SERVICE_IDS.default ??
    [];

  const byId = new Map(ATLAS_UTILITY_SERVICE_CATALOG.map((s) => [s.id, s]));
  const links: AtlasUtilityServiceLink[] = [];

  for (const id of ids) {
    const def = byId.get(id);
    if (!def) continue;
    const url = resolveUtilityServiceUrl(def, edition);
    if (!url) continue;
    links.push({
      id: def.id,
      kind: def.kind,
      label: def.label,
      description: def.description,
      provider: def.provider,
      url,
      icon: def.icon,
      mode: def.mode,
      openInNewTab: true,
    });
  }

  return links;
}
