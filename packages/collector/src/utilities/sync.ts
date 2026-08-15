import {
  ATLAS_EDITION,
  ATLAS_EDITION_UTILITY_SERVICE_IDS,
  ATLAS_UTILITY_SERVICE_CATALOG,
  buildCinemaVenues,
  resolveUtilityServiceUrl,
  type AtlasEdition,
  type AtlasUtilityServiceKind,
  type UtilitySyncSnapshot,
} from "@atlas/core";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchHtml } from "../connectors/fetch-html.js";
import { getUtilityDutyDate, parsePharmaciesFromPagineGialle } from "./parse-pharmacies.js";
import { parseCinemaFromMyMovies } from "./parse.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface SyncUtilitiesOptions {
  edition?: AtlasEdition;
  outputPath?: string;
}

function resolveEditionServiceUrl(
  edition: AtlasEdition,
  kind: AtlasUtilityServiceKind,
): string | null {
  const ids =
    ATLAS_EDITION_UTILITY_SERVICE_IDS[edition.id] ??
    ATLAS_EDITION_UTILITY_SERVICE_IDS.default ??
    [];
  const catalog = new Map(ATLAS_UTILITY_SERVICE_CATALOG.map((service) => [service.id, service]));

  for (const id of ids) {
    const definition = catalog.get(id);
    if (!definition || definition.kind !== kind) continue;
    const url = resolveUtilityServiceUrl(definition, edition);
    if (url) return url;
  }

  return null;
}

function defaultOutputPath(editionId: string): string {
  return resolve(__dirname, `../../../../apps/web/public/data/utilities/${editionId}.json`);
}

export async function syncUtilities(options: SyncUtilitiesOptions = {}): Promise<UtilitySyncSnapshot> {
  const edition = options.edition ?? ATLAS_EDITION;
  const pharmacyUrl = resolveEditionServiceUrl(edition, "pharmacy_duty");
  const cinemaUrl = resolveEditionServiceUrl(edition, "cinema_listings");

  if (!pharmacyUrl) {
    throw new Error(`URL farmacie non configurato per edizione ${edition.id}`);
  }
  if (!cinemaUrl) {
    throw new Error(`URL cinema non configurato per edizione ${edition.id}`);
  }

  console.log(`→ Farmacie (${edition.id}): ${pharmacyUrl}`);
  const pharmacyHtml = await fetchHtml(pharmacyUrl, { retries: 3 });
  const dutyDate = getUtilityDutyDate();
  const pharmacies = parsePharmaciesFromPagineGialle(pharmacyHtml, dutyDate);
  console.log(`  ${pharmacies.length} farmacie di turno per il ${dutyDate}`);

  console.log(`→ Cinema (${edition.id}): ${cinemaUrl}`);
  const cinemaHtml = await fetchHtml(cinemaUrl);
  const cinema = parseCinemaFromMyMovies(cinemaHtml);
  console.log(`  ${cinema.length} film in programmazione`);
  const venues = buildCinemaVenues(cinema);

  const municipalitySlug = edition.geo?.municipalitySlug ?? edition.id;
  const snapshot: UtilitySyncSnapshot = {
    editionId: edition.id,
    territoryId: edition.territoryId,
    syncedAt: new Date().toISOString(),
    pharmacies: {
      sourceUrl: pharmacyUrl,
      sourceLabel: "Pagine Gialle",
      dutyDate,
      consult: {
        all: pharmacyUrl,
        map: `https://www.paginegialle.it/mappa/farmacie-turno/${municipalitySlug}?rk=`,
      },
      items: pharmacies,
    },
    cinema: {
      sourceUrl: cinemaUrl,
      sourceLabel: "MYmovies",
      items: cinema,
      venues,
    },
  };

  const outputPath = options.outputPath ?? defaultOutputPath(edition.id);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`✓ Salvato ${outputPath}`);

  return snapshot;
}
