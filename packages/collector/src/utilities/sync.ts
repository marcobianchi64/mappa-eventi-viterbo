import {
  ATLAS_EDITION,
  ATLAS_EDITION_UTILITY_SERVICE_IDS,
  ATLAS_UTILITY_SERVICE_CATALOG,
  resolveUtilityServiceUrl,
  type AtlasEdition,
  type AtlasUtilityServiceKind,
  type UtilitySyncSnapshot,
} from "@atlas/core";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchHtml } from "../connectors/fetch-html.js";
import { parseCinemaFromMyMovies, parsePharmaciesFromPagineGialle } from "./parse.js";

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
  const pharmacyHtml = await fetchHtml(pharmacyUrl);
  const pharmacies = parsePharmaciesFromPagineGialle(pharmacyHtml);
  console.log(`  ${pharmacies.length} farmacie trovate`);

  console.log(`→ Cinema (${edition.id}): ${cinemaUrl}`);
  const cinemaHtml = await fetchHtml(cinemaUrl);
  const cinema = parseCinemaFromMyMovies(cinemaHtml);
  console.log(`  ${cinema.length} film in programmazione`);

  const snapshot: UtilitySyncSnapshot = {
    editionId: edition.id,
    territoryId: edition.territoryId,
    syncedAt: new Date().toISOString(),
    pharmacies: {
      sourceUrl: pharmacyUrl,
      sourceLabel: "Pagine Gialle",
      items: pharmacies,
    },
    cinema: {
      sourceUrl: cinemaUrl,
      sourceLabel: "MYmovies",
      items: cinema,
    },
  };

  const outputPath = options.outputPath ?? defaultOutputPath(edition.id);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`✓ Salvato ${outputPath}`);

  return snapshot;
}
