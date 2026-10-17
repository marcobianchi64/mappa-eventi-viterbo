import {
  ATLAS_EDITION,
  ATLAS_EDITION_UTILITY_SERVICE_IDS,
  ATLAS_UTILITY_SERVICE_CATALOG,
  attachPharmacyPlaceIds,
  buildCinemaVenues,
  checkCinemaCoverage,
  coverageToAlerts,
  resolveUtilityServiceUrl,
  type AtlasEdition,
  type AtlasUtilityServiceKind,
  type UtilitySyncSnapshot,
} from "@atlas/core";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchHtml } from "../connectors/fetch-html.js";
import { getUtilityDutyDate, parsePharmaciesFromPagineGialle } from "./parse-pharmacies.js";
import { parseCinemaFromMyMovies } from "./parse.js";
import { UtilitySyncWriter } from "./persist.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface SyncUtilitiesOptions {
  edition?: AtlasEdition;
  outputPath?: string;
  persistence?: { supabaseUrl: string; serviceRoleKey: string };
  /** Se true, in caso di HTTP 403/timeout riusa l'ultimo snapshot su disco (utile in CI). */
  allowStaleFallback?: boolean;
}

async function loadExistingSnapshot(path: string): Promise<UtilitySyncSnapshot | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as UtilitySyncSnapshot;
  } catch {
    return null;
  }
}

function staleFallbackEnabled(options: SyncUtilitiesOptions): boolean {
  if (options.allowStaleFallback === true) return true;
  if (options.allowStaleFallback === false) return false;
  return process.env.ATLAS_UTILITY_ALLOW_STALE === "1" || process.env.GITHUB_ACTIONS === "true";
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

  const outputPath = options.outputPath ?? defaultOutputPath(edition.id);
  const existing = await loadExistingSnapshot(outputPath);
  const allowStale = staleFallbackEnabled(options);

  console.log(`→ Farmacie (${edition.id}): ${pharmacyUrl}`);
  let pharmacies = existing?.pharmacies.items ?? [];
  let dutyDate = getUtilityDutyDate();
  let pharmacyStale = false;
  try {
    const pharmacyHtml = await fetchHtml(pharmacyUrl, { retries: 2 });
    dutyDate = getUtilityDutyDate();
    pharmacies = attachPharmacyPlaceIds(parsePharmaciesFromPagineGialle(pharmacyHtml, dutyDate));
    console.log(`  ${pharmacies.length} farmacie di turno per il ${dutyDate}`);
  } catch (error) {
    if (allowStale && existing?.pharmacies?.items?.length) {
      pharmacyStale = true;
      dutyDate = existing.pharmacies.dutyDate ?? dutyDate;
      pharmacies = existing.pharmacies.items;
      console.warn(
        `  ⚠ Farmacie: fetch fallito (${(error as Error).message}); uso snapshot del ${existing.syncedAt}`,
      );
    } else {
      throw error;
    }
  }

  console.log(`→ Cinema (${edition.id}): ${cinemaUrl}`);
  let cinema = existing?.cinema.items ?? [];
  let venues = existing?.cinema.venues ?? buildCinemaVenues(cinema);
  let cinemaStale = false;
  try {
    const cinemaHtml = await fetchHtml(cinemaUrl, { retries: 2 });
    cinema = parseCinemaFromMyMovies(cinemaHtml);
    console.log(`  ${cinema.length} film in programmazione`);
    venues = buildCinemaVenues(cinema);
  } catch (error) {
    if (allowStale && existing?.cinema?.items?.length) {
      cinemaStale = true;
      cinema = existing.cinema.items;
      venues = existing.cinema.venues ?? buildCinemaVenues(cinema);
      console.warn(
        `  ⚠ Cinema: fetch fallito (${(error as Error).message}); uso snapshot del ${existing.syncedAt}`,
      );
    } else {
      throw error;
    }
  }

  const cinemaCoverage = checkCinemaCoverage(venues);
  let operationalAlerts = coverageToAlerts(cinemaCoverage);
  if (pharmacyStale || cinemaStale) {
    operationalAlerts = [
      ...operationalAlerts,
      {
        alertType: "stale_data",
        severity: "warning",
        title: "Sync utilità parziale",
        message:
          "Una o più fonti esterne hanno rifiutato la richiesta (es. 403 da datacenter). Dati da ultimo snapshot locale.",
        territoryId: edition.territoryId,
      },
    ];
  }
  if (cinemaCoverage.missing.length > 0) {
    console.warn(
      `  ⚠ Copertura cinema: ${cinemaCoverage.found}/${cinemaCoverage.expected} sale con dati`,
    );
    for (const gap of cinemaCoverage.missing) {
      console.warn(`    · ${gap.placeName} (${gap.municipality ?? "?"}) — ${gap.reason}`);
    }
  }

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
    coverage: { cinema: cinemaCoverage },
    operationalAlerts,
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`✓ Salvato ${outputPath}`);

  if (options.persistence) {
    await new UtilitySyncWriter({
      url: options.persistence.supabaseUrl,
      serviceRoleKey: options.persistence.serviceRoleKey,
    }).persist(snapshot);
    console.log("✓ Osservazioni e alert utility aggiornati su Supabase");
  }

  return snapshot;
}
